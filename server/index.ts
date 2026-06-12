import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import * as googleTTS from 'google-tts-api';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Store connection state
interface ClientState {
  geminiApiKey: string;
  ollamaEndpoint: string;
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

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.set(ws, { geminiApiKey: '', ollamaEndpoint: 'http://localhost:11434', history: [] });

  ws.on('message', async (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage.toString());
      const state = clients.get(ws);
      if (!state) return;

      if (msg.type === 'config') {
        state.geminiApiKey = msg.settings.apiKey;
        state.ollamaEndpoint = msg.settings.ollamaEndpoint;
        console.log('Updated config for client');
      } 
      else if (msg.type === 'audio') {
        const base64Audio = msg.data;
        ws.send(JSON.stringify({ type: 'status', state: 'processing' }));

        if (state.geminiApiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey: state.geminiApiKey });
            
            const prompt = "你是一個名為 chibi-moe 的可愛機器人伴侶。請簡短、友善、活潑地用繁體中文回覆我的語音訊息。";
            
            const response = await ai.models.generateContent({
              model: 'gemini-1.5-flash',
              contents: [
                ...state.history,
                {
                  role: 'user',
                  parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
                  ]
                }
              ],
            });

            const replyText = response.text || '';
            console.log('Gemini reply:', replyText);

            // Add to history (skip storing large audio to prevent huge context, or store a text placeholder)
            state.history.push({ role: 'user', parts: [{ text: "[用戶傳送了一段語音]" }] });
            state.history.push({ role: 'model', parts: [{ text: replyText }] });

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
          // Fallback message for Ollama / missing key
          ws.send(JSON.stringify({ type: 'text', data: 'Gemini API Key 尚未設定。Ollama 本地語音辨識功能仍在開發中，請先輸入 API Key 使用 Gemini。' }));
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
