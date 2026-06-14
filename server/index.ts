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
  role: 'unknown' | 'web' | 'robot';
  geminiApiKey: string;
  ollamaEndpoint: string;
  enableMachineOps: boolean;
  history: any[];
  connectedAt: string;
  lastSeenAt: string;
  lastFrameAt?: string;
  binaryFrameCount: number;
}

const clients = new Map<WebSocket, ClientState>();
const serverLogs: Array<{ time: string; level: 'info' | 'warn' | 'error'; message: string }> = [];
const MAX_SERVER_LOGS = 200;

function getClientCounts() {
  let web = 0;
  let robot = 0;
  let unknown = 0;

  clients.forEach(state => {
    if (state.role === 'web') web += 1;
    else if (state.role === 'robot') robot += 1;
    else unknown += 1;
  });

  return { web, robot, unknown };
}

function getLastRobotFrameAt() {
  let lastFrameAt = '';
  clients.forEach(state => {
    if (state.role !== 'robot' || !state.lastFrameAt) return;
    if (!lastFrameAt || state.lastFrameAt > lastFrameAt) {
      lastFrameAt = state.lastFrameAt;
    }
  });
  return lastFrameAt;
}

function getRobotFrameCount() {
  let frameCount = 0;
  clients.forEach(state => {
    if (state.role === 'robot') {
      frameCount += state.binaryFrameCount;
    }
  });
  return frameCount;
}

function getServerStatus() {
  const counts = getClientCounts();
  return {
    type: 'backend_status',
    web: {
      connected: counts.web > 0,
      count: counts.web,
    },
    robot: {
      connected: counts.robot > 0,
      count: counts.robot,
      lastFrameAt: getLastRobotFrameAt(),
      frameCount: getRobotFrameCount(),
    },
    unknownClients: counts.unknown,
    updatedAt: new Date().toISOString(),
  };
}

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

function sendToWebClients(data: unknown) {
  clients.forEach((state, client) => {
    if (state.role === 'web') {
      sendJson(client, data);
    }
  });
}

function sendToRobotClients(data: unknown): number {
  let sent = 0;
  clients.forEach((state, client) => {
    if (state.role === 'robot' && client.readyState === WebSocket.OPEN) {
      sendJson(client, data);
      sent++;
    }
  });
  return sent;
}

function broadcastServerStatus() {
  sendToWebClients(getServerStatus());
}

function recordLog(level: 'info' | 'warn' | 'error', message: string) {
  const entry = { time: new Date().toISOString(), level, message };
  serverLogs.push(entry);
  if (serverLogs.length > MAX_SERVER_LOGS) {
    serverLogs.splice(0, serverLogs.length - MAX_SERVER_LOGS);
  }

  const line = `[${entry.time}] ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  sendToWebClients({ type: 'backend_log', entry });
}

function setClientRole(ws: WebSocket, role: ClientState['role']) {
  const state = clients.get(ws);
  if (!state || state.role === role) return;

  const previousRole = state.role;
  state.role = role;
  state.lastSeenAt = new Date().toISOString();
  recordLog('info', `Client role changed: ${previousRole} -> ${role}`);
  broadcastServerStatus();
}

app.get('/status', (_req, res) => {
  res.json({
    ...getServerStatus(),
    logs: serverLogs,
  });
});

// ===== REST API for Robot Control =====
// These endpoints allow external clients (e.g. Vercel frontend) to control
// the robot via HTTP instead of WebSocket.

app.post('/api/robot/move', (req, res) => {
  const { action, duration = 500 } = req.body || {};
  const validActions = ['move_forward', 'move_backward', 'turn_left', 'turn_right', 'dance', 'spin_around'];

  if (!action || !validActions.includes(action)) {
    return res.status(400).json({
      error: 'Invalid action',
      validActions,
    });
  }

  const cmd = buildFirmwareCommand('robot_move', { action, duration: Number(duration) });
  const sent = sendToRobotClients(cmd);
  sendToWebClients(cmd); // Also notify web clients for chat log

  recordLog('info', `[API] robot/move: ${action} ${duration}ms → ${sent} robot(s)`);
  res.json({ ok: true, action, duration, robotsReached: sent });
});

app.post('/api/robot/stop', (_req, res) => {
  const cmd = buildFirmwareCommand('robot_move', { action: 'stop', duration: 0 });
  const sent = sendToRobotClients(cmd);

  recordLog('info', `[API] robot/stop → ${sent} robot(s)`);
  res.json({ ok: true, action: 'stop', robotsReached: sent });
});

app.post('/api/robot/expression', (req, res) => {
  const { emotion = 'neutral' } = req.body || {};
  const validEmotions = ['happy', 'sad', 'angry', 'surprised', 'neutral'];

  if (!validEmotions.includes(emotion)) {
    return res.status(400).json({
      error: 'Invalid emotion',
      validEmotions,
    });
  }

  const cmd = buildFirmwareCommand('robot_expression', { emotion });
  const sent = sendToRobotClients(cmd);
  sendToWebClients(cmd);

  recordLog('info', `[API] robot/expression: ${emotion} → ${sent} robot(s)`);
  res.json({ ok: true, emotion, robotsReached: sent });
});

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
  const now = new Date().toISOString();
  recordLog('info', 'Client connected');
  clients.set(ws, {
    role: 'unknown',
    geminiApiKey: '',
    ollamaEndpoint: 'http://localhost:11434',
    enableMachineOps: false,
    history: [],
    connectedAt: now,
    lastSeenAt: now,
    binaryFrameCount: 0,
  });
  broadcastServerStatus();

  ws.on('message', async (rawMessage, isBinary) => {
    try {
      const state = clients.get(ws);
      if (state) {
        state.lastSeenAt = new Date().toISOString();
      }

      if (isBinary) {
        if (state) {
          if (state.role !== 'robot') {
            setClientRole(ws, 'robot');
          }

          state.binaryFrameCount += 1;
          state.lastFrameAt = new Date().toISOString();
          if (state.binaryFrameCount === 1 || state.binaryFrameCount % 100 === 0) {
            recordLog('info', `Robot video frame received: ${rawMessage instanceof Buffer ? (rawMessage as Buffer).length : 'unknown'} bytes, total ${state.binaryFrameCount}`);
          }
        }

        clients.forEach((clientState, client) => {
          if (client !== ws && clientState.role === 'web' && client.readyState === WebSocket.OPEN) {
            client.send(rawMessage, { binary: true });
          }
        });
        broadcastServerStatus();
        return;
      }

      const msg = JSON.parse(rawMessage.toString());
      if (!state) return;

      if (msg.type === 'config') {
        setClientRole(ws, 'web');
        state.geminiApiKey = String(msg.settings?.apiKey || '');
        state.ollamaEndpoint = String(msg.settings?.ollamaEndpoint || 'http://localhost:11434');
        state.enableMachineOps = Boolean(msg.settings?.enableMachineOps);
        recordLog('info', `Web config updated. Machine Ops: ${state.enableMachineOps}`);
        sendJson(ws, getServerStatus());
        sendJson(ws, { type: 'backend_log_snapshot', logs: serverLogs });
        return;
      }

      if (msg.type === 'status') {
        setClientRole(ws, 'robot');
        recordLog('info', `[Robot] Status received: ${JSON.stringify(msg)}`);
        broadcastJson(msg, ws);
        broadcastServerStatus();
        return;
      }

      if (msg.type === 'camera_control') {
        recordLog('info', `[UI] Camera control: ${msg.enabled}`);
        broadcastJson(msg, ws); // broadcast to ESP32
        return;
      }

      if (msg.type !== 'audio') return;

      const base64Audio = String(msg.data || '');
      const audioFormat = String(msg.format || 'webm');
      const mimeType = audioFormat === 'wav' ? 'audio/wav' : 'audio/webm';

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
            { inlineData: { mimeType: mimeType, data: base64Audio } },
          ],
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.0-preview',
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
            recordLog('info', `Function call: ${call.name} ${JSON.stringify(call.args)}`);
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
            model: 'gemini-3.0-preview',
            contents: state.history,
          });

          replyText = finalResponse.text || '';
        }

        state.history.push({ role: 'model', parts: [{ text: replyText }] });
        recordLog('info', `Gemini reply: ${replyText}`);

        sendJson(ws, { type: 'text', data: replyText });

        const ttsBase64 = await generateTTS(replyText);
        if (ttsBase64) {
          sendJson(ws, { type: 'audio_out', data: ttsBase64 });
        } else {
          sendJson(ws, { type: 'status', state: 'idle' });
        }
      } catch (e: any) {
        recordLog('error', `Gemini Error: ${e.message}`);
        sendJson(ws, { type: 'text', data: 'Gemini API error: ' + e.message });
        sendJson(ws, { type: 'status', state: 'idle' });
      }
    } catch (e) {
      recordLog('error', `Error handling WS message: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  ws.on('close', () => {
    const state = clients.get(ws);
    clients.delete(ws);
    recordLog('info', `Client disconnected${state ? ` (${state.role})` : ''}`);
    broadcastServerStatus();
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  recordLog('info', `Server listening on port ${PORT}`);
});
