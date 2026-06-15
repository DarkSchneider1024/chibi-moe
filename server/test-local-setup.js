const WebSocket = require('ws');

const SERVER_URL = 'ws://localhost:3001';
const HTTP_URL = 'http://localhost:3001';

console.log('=== Starting Chibi-Moe Local Backend Integration Tests ===');

async function runTests() {
  let webWs, robotWs;
  
  try {
    // 1. Connect Web Client
    console.log('[Test] Connecting mock Web client...');
    webWs = new WebSocket(SERVER_URL);
    
    await new Promise((resolve, reject) => {
      webWs.on('open', resolve);
      webWs.on('error', reject);
    });
    console.log('[Test] Mock Web client connected successfully.');

    // Send Web config
    webWs.send(JSON.stringify({
      type: 'config',
      settings: {
        apiKey: 'dummy-api-key',
        ollamaEndpoint: 'http://localhost:11434',
        enableMachineOps: true
      }
    }));
    console.log('[Test] Web config sent.');

    // 2. Connect Robot Client
    console.log('[Test] Connecting mock Robot client...');
    robotWs = new WebSocket(SERVER_URL);
    
    await new Promise((resolve, reject) => {
      robotWs.on('open', resolve);
      robotWs.on('error', reject);
    });
    console.log('[Test] Mock Robot client connected successfully.');

    // Send Robot status
    robotWs.send(JSON.stringify({
      type: 'status',
      state: 'idle',
      battery: 88
    }));
    console.log('[Test] Robot status sent.');

    // Setup expectations
    const testPromises = [];

    // Expectation A: Robot receives motion command via HTTP REST API
    const robotMovePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for robot_move command')), 5000);
      robotWs.on('message', (data, isBinary) => {
        if (isBinary) return;
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'command' && msg.cmd === 'move' && msg.dir === 'forward') {
            clearTimeout(timeout);
            console.log('[SUCCESS] Mock Robot received command "move forward" successfully!');
            resolve();
          }
        } catch (e) {
          // ignore parsing error
        }
      });
    });
    testPromises.push(robotMovePromise);

    // Expectation B: Robot receives update_config command when Web client triggers it
    const robotConfigSyncPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for update_config command')), 5000);
      // We listen to the same socket or set up a wrapper.
      // Since robotWs.on('message') was registered above, it'll receive all messages.
      // Let's attach another listener or handle it in one listener.
      robotWs.on('message', (data, isBinary) => {
        if (isBinary) return;
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'command' && msg.cmd === 'update_config') {
            if (msg.args.websocket_host === '192.168.1.250' && msg.args.websocket_port === 3001) {
              clearTimeout(timeout);
              console.log('[SUCCESS] Mock Robot received command "update_config" with correct args!');
              resolve();
            }
          }
        } catch (e) {
          // ignore
        }
      });
    });
    testPromises.push(robotConfigSyncPromise);

    // Expectation C: Web client receives the server status update indicating robot is connected
    const webStatusPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for backend_status')), 5000);
      webWs.on('message', (data, isBinary) => {
        if (isBinary) return;
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'backend_status' && msg.robot.connected === true) {
            clearTimeout(timeout);
            console.log('[SUCCESS] Mock Web client received backend status: Robot is connected.');
            resolve();
          }
        } catch (e) {
          // ignore
        }
      });
    });
    testPromises.push(webStatusPromise);

    // Wait a brief moment for connection registration to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Trigger REST API call
    console.log('[Test] Triggering remote control HTTP API POST /api/robot/move...');
    const moveRes = await fetch(`${HTTP_URL}/api/robot/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move_forward', duration: 1000 })
    });
    const moveResultJson = await moveRes.json();
    console.log('[Test] HTTP API response:', moveResultJson);
    if (!moveResultJson.ok || moveResultJson.robotsReached === 0) {
      throw new Error('Remote control API failed or did not reach any robots');
    }
    console.log('[SUCCESS] Remote control HTTP API works correctly.');

    // Trigger config sync via Web client WS
    console.log('[Test] Sending update_config message from mock Web client via WS...');
    webWs.send(JSON.stringify({
      type: 'update_config',
      websocket_host: '192.168.1.250',
      websocket_port: 3001
    }));

    // Wait for all expectations to fulfill
    await Promise.all(testPromises);

    console.log('\n=======================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('=======================================');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exit(1);
  } finally {
    if (webWs && webWs.readyState === WebSocket.OPEN) webWs.close();
    if (robotWs && robotWs.readyState === WebSocket.OPEN) robotWs.close();
  }
}

runTests();
