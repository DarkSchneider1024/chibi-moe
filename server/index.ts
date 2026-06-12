import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// MCP Server 狀態 (Placeholder)
let mcpServerActive = true;

wss.on('connection', (ws) => {
  console.log('Robot connected via WebSocket');

  ws.on('message', (message) => {
    console.log(`Received message => ${message}`);
    
    // TODO: 處理機器人傳來的語音或文字
    // 1. 若是語音，先轉文字 (STT)
    // 2. 丟給 Gemini / Ollama API
    // 3. 處理 LLM 回應或 MCP Tool 呼叫
    
    // 範例回應
    ws.send(JSON.stringify({ type: 'text', data: 'I heard you!' }));
  });

  ws.on('close', () => {
    console.log('Robot disconnected');
  });
});

app.get('/', (req, res) => {
  res.send('Chibi-Moe Backend is running!');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
