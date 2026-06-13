import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import * as googleTTS from 'google-tts-api';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

// Proxy route to bypass CORS for downloading firmware binaries.
app.get('/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send('Missing url parameter');

    console.log(`Proxying download: ${targetUrl}`);
    const fetchRes = await fetch(targetUrl);
    if (!fetchRes.ok) return res.status(fetchRes.status).send('Failed to fetch');

    const arrayBuffer = await fetchRes.arrayBuffer();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(arrayBuffer));
  } catch (e: any) {
    console.error('Proxy Error:', e);
    res.status(500).send('Proxy Error: ' + e.message);
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface ClientState {
  geminiApiKey: string;
  ollamaEndpoint: string;
  enableMachineOps: boolean;
  history: any[];
}

const clients = new Map<WebSocket, ClientState>();

function sendJson(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastJson(data: unknown, except?: WebSocket) {
  wss.clients.forEach(client => {
    if (client !== except) {
      sendJson(client, data);
    }
  });
}

function buildFirmwareCommand(functionName: string, args: any) {
  if (functionName === 'robot_move') {
    const action = String(args?.action || '');
    const dirMap: Record<string, string> = {
      move_forward: 'forward',
      move_backward: 'backward',
      turn_left: 'left',
      turn_right: 'right',
      dance: 'dance',
      spin_around: 'spin_around',
    };

    return {
      type: 'command',
      action: functionName,
      args,
      cmd: 'move',
      dir: dirMap[action] || action,
      duration: Number(args?.duration || 0),
    };
  }

  if (functionName === 'robot_expression') {
    return {
      type: 'command',
      action: functionName,
      args,
      cmd: 'expression',
      emotion: String(args?.emotion || 'neutral'),
    };
  }

  return { type: 'command', action: functionName, args };
}

async function generateTTS(text: string): Promise<string> {
  try {
    return await googleTTS.getAudioBase64(text, {
      lang: 'zh-TW',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
    });
  } catch (error) {
    console.error('TTS error', error);
    return '';
  }
}

const robotTools = [{
  functionDeclarations: [
    {
      name: 'robot_move',
      description: 'Control the robot movement.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ['move_forward', 'move_backward', 'turn_left', 'turn_right', 'dance', 'spin_around'],
          },
          duration: { type: Type.INTEGER, description: 'Duration in milliseconds' },
        },
        required: ['action', 'duration'],
      },
    },
    {
      name: 'robot_expression',
      description: 'Control the robot facial expression or LED color.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          emotion: { type: Type.STRING, enum: ['happy', 'sad', 'angry', 'surprised', 'neutral'] },
        },
        required: ['emotion'],
      },
    },
  ],
}];

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.set(ws, {
    geminiApiKey: '',
    ollamaEndpoint: 'http://localhost:11434',
    enableMachineOps: false,
    history: [],
  });

  ws.on('message', async (rawMessage, isBinary) => {
    try {
      if (isBinary) {
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(rawMessage, { binary: true });
          }
        });
        return;
      }

      const msg = JSON.parse(rawMessage.toString());
      const state = clients.get(ws);
      if (!state) return;

      if (msg.type === 'config') {
        state.geminiApiKey = String(msg.settings?.apiKey || '');
        state.ollamaEndpoint = String(msg.settings?.ollamaEndpoint || 'http://localhost:11434');
        state.enableMachineOps = Boolean(msg.settings?.enableMachineOps);
        console.log('Updated config for client. Machine Ops:', state.enableMachineOps);
        return;
      }

      if (msg.type === 'status') {
        broadcastJson(msg, ws);
        return;
      }

      if (msg.type !== 'audio') return;

      const base64Audio = String(msg.data || '');
      sendJson(ws, { type: 'status', state: 'processing' });

      if (!state.geminiApiKey) {
        sendJson(ws, { type: 'text', data: 'Please set the Gemini API Key in Settings first.' });
        sendJson(ws, { type: 'status', state: 'idle' });
        return;
      }

      try {
        const ai = new GoogleGenAI({ apiKey: state.geminiApiKey });
        let prompt = 'You are chibi-moe, a cute voice assistant. Reply in natural, concise Traditional Chinese.';

        if (state.enableMachineOps) {
          prompt += ' If the user asks for movement, dancing, spinning, or expression changes, use the available robot tool. Do not call tools unless the user clearly asks for hardware operation.';
        }

        state.history.push({
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
          ],
        });

        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: state.history,
          ...(state.enableMachineOps ? { config: { tools: robotTools as any } } : {}),
        });

        let replyText = response.text || '';
        state.history[state.history.length - 1].parts[0].text = '[Audio message]';

        if (response.functionCalls && response.functionCalls.length > 0) {
          const calls = response.functionCalls;
          const functionResponses: any[] = [];

          state.history.push({ role: 'model', parts: calls.map(call => ({ functionCall: call })) });

          for (const call of calls) {
            console.log('Function call:', call.name, call.args);
            broadcastJson(buildFirmwareCommand(call.name || '', call.args));
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { result: `Executed ${call.name} successfully.` },
              },
            });
          }

          state.history.push({ role: 'user', parts: functionResponses });
          const finalResponse = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: state.history,
          });

          replyText = finalResponse.text || '';
        }

        state.history.push({ role: 'model', parts: [{ text: replyText }] });
        console.log('Gemini reply:', replyText);

        sendJson(ws, { type: 'text', data: replyText });

        const ttsBase64 = await generateTTS(replyText);
        if (ttsBase64) {
          sendJson(ws, { type: 'audio_out', data: ttsBase64 });
        } else {
          sendJson(ws, { type: 'status', state: 'idle' });
        }
      } catch (e: any) {
        console.error('Gemini Error:', e);
        sendJson(ws, { type: 'text', data: 'Gemini API error: ' + e.message });
        sendJson(ws, { type: 'status', state: 'idle' });
      }
    } catch (e) {
      console.error('Error handling WS message', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
