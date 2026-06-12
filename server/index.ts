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

// Proxy route to bypass CORS for downloading firmware binaries
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

// Store connection state
interface ClientState {
  geminiApiKey: string;
  ollamaEndpoint: string;
  enableMachineOps: boolean;
  history: any[];
}

const clients = new Map<WebSocket, ClientState>();

// helper function for TTS
async function generateTTS(text: string): Promise<string> {
  try {
    const base64Audio = await googleTTS.getAudioBase64(text, {
      lang: 'zh-TW',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
    });
    return base64Audio;
  } catch (error) {
    console.error('TTS error', error);
    return '';
  }
}

// Define Robot Tools
const robotTools = [{
  functionDeclarations: [
    {
      name: 'robot_move',
      description: 'Control the robot movement.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ['move_forward', 'move_backward', 'turn_left', 'turn_right', 'dance', 'spin_around'] },
          duration: { type: Type.INTEGER, description: 'Duration in milliseconds' }
        },
        required: ['action', 'duration']
      }
    },
    {
      name: 'robot_expression',
      description: 'Control the robot facial expression or LED color.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          emotion: { type: Type.STRING, enum: ['happy', 'sad', 'angry', 'surprised', 'neutral'] }
        },
        required: ['emotion']
      }
    }
  ]
}];

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.set(ws, { geminiApiKey: '', ollamaEndpoint: 'http://localhost:11434', enableMachineOps: false, history: [] });

  ws.on('message', async (rawMessage, isBinary) => {
    try {
      if (isBinary) {
        // Binary message (e.g. video frame from ESP32). Broadcast to all other clients.
        wss.clients.forEach(c => {
          if (c !== ws && c.readyState === WebSocket.OPEN) {
            c.send(rawMessage, { binary: true });
          }
        });
        return;
      }

      const msg = JSON.parse(rawMessage.toString());
      const state = clients.get(ws);
      if (!state) return;

      if (msg.type === 'config') {
        state.geminiApiKey = msg.settings.apiKey;
        state.ollamaEndpoint = msg.settings.ollamaEndpoint;
        state.enableMachineOps = msg.settings.enableMachineOps || false;
        console.log('Updated config for client. Machine Ops:', state.enableMachineOps);
      } 
      else if (msg.type === 'audio') {
        const base64Audio = msg.data;
        ws.send(JSON.stringify({ type: 'status', state: 'processing' }));

        if (state.geminiApiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey: state.geminiApiKey });
            
            let prompt = "你是一個名為 chibi-moe 的可愛機器人伴侶。請簡短、友善、活潑地用繁體中文回覆我的語音訊息。";
            if (state.enableMachineOps) {
              prompt += " 若對話情境適合，你可以呼叫工具來控制機器人移動或改變表情！";
              prompt += " 注意：如果使用者要求你做你不會或硬體無法支援的動作（例如後空翻、飛起來等），請呼叫 robot_move 工具並將 action 設為 'spin_around'，然後在後續的回覆文字說「這個動作我還不會哦，我轉圈圈給你看！」之類的話。";
            }
            
            state.history.push({ role: 'user', parts: [
              { text: prompt },
              { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
            ]});

            // Generate response – include tools config only when machine ops are enabled
            let response;
            if (state.enableMachineOps) {
              response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: state.history,
                config: { tools: robotTools }
              });
            } else {
              response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: state.history
              });
            }

            let replyText = response.text || '';

            // Clean up the prompt from history to save tokens for next turns
            state.history[state.history.length - 1].parts[0].text = "[用戶傳送了一段語音]";

            // Handle Function Calls
            if (response.functionCalls && response.functionCalls.length > 0) {
              const calls = response.functionCalls;
              const functionResponses: any[] = [];
              
              state.history.push({ role: 'model', parts: calls.map(c => ({ functionCall: c })) });

              for (const call of calls) {
                console.log('Function call:', call.name, call.args);
                
                // Broadcast command to all connected clients (Robot & Web UI)
                const cmd = {
                  type: 'command',
                  action: call.name,
                  args: call.args
                };
                wss.clients.forEach(c => {
                  if (c.readyState === WebSocket.OPEN) {
                    c.send(JSON.stringify(cmd));
                  }
                });

                functionResponses.push({
                  functionResponse: {
                    name: call.name,
                    response: { result: `Executed ${call.name} successfully.` }
                  }
                });
              }

              // Send the result back to Gemini to get the final spoken response
              state.history.push({ role: 'user', parts: functionResponses });
              
            // Final response – include tools config only when machine ops are enabled
            let finalResponse;
            if (state.enableMachineOps) {
              finalResponse = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: state.history,
                config: { tools: robotTools }
              });
            } else {
              finalResponse = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: state.history
              });
            }

              replyText = finalResponse.text || '';
              state.history.push({ role: 'model', parts: [{ text: replyText }] });
            } else {
              state.history.push({ role: 'model', parts: [{ text: replyText }] });
            }

            console.log('Gemini reply:', replyText);

            // Send text reply to client log
            ws.send(JSON.stringify({ type: 'text', data: replyText }));

            // Generate TTS
            const ttsBase64 = await generateTTS(replyText);
            if (ttsBase64) {
               ws.send(JSON.stringify({ type: 'audio_out', data: ttsBase64 }));
            } else {
               ws.send(JSON.stringify({ type: 'status', state: 'idle' }));
            }

          } catch (e: any) {
            console.error('Gemini Error:', e);
            ws.send(JSON.stringify({ type: 'text', data: 'Gemini API 發生錯誤: ' + e.message }));
            ws.send(JSON.stringify({ type: 'status', state: 'idle' }));
          }
        } else {
          // Fallback
          ws.send(JSON.stringify({ type: 'text', data: 'Gemini API Key 尚未設定。請先輸入 API Key。' }));
          ws.send(JSON.stringify({ type: 'status', state: 'idle' }));
        }
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
