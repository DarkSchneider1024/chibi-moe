#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

// Global config variables
String wifi_ssid = "";
String wifi_password = "";
String websocket_host = "";
int websocket_port = 443;
String websocket_path = "/";

WebSocketsClient webSocket;

// Load config from LittleFS
bool loadConfig() {
  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS Mount Failed");
    return false;
  }

  File file = LittleFS.open("/config.json", "r");
  if (!file) {
    Serial.println("Failed to open config.json");
    return false;
  }

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, file);
  if (error) {
    Serial.println("Failed to parse config.json");
    return false;
  }

  wifi_ssid = doc["wifi_ssid"].as<String>();
  wifi_password = doc["wifi_password"].as<String>();
  websocket_host = doc["websocket_host"].as<String>();
  websocket_port = doc["websocket_port"].as<int>();
  websocket_path = doc["websocket_path"].as<String>();

  Serial.println("Config loaded successfully:");
  Serial.println("SSID: " + wifi_ssid);
  Serial.println("WS Host: " + websocket_host);
  
  file.close();
  return true;
}

// WebSocket Event Handler
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WSc] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.printf("[WSc] Connected to url: %s\n", payload);
      // Send a status message to register the robot
      webSocket.sendTXT("{\"type\":\"status\",\"state\":\"idle\",\"battery\":100}");
      break;
    case WStype_TEXT: {
      Serial.printf("[WSc] get text: %s\n", payload);
      
      // Parse the incoming JSON command
      StaticJsonDocument<1024> doc;
      DeserializationError error = deserializeJson(doc, payload, length);
      
      if (!error) {
        String msgType = doc["type"].as<String>();
        
        if (msgType == "command") {
          String cmd = doc["cmd"].as<String>();
          String dir = doc["dir"].as<String>();
          
          Serial.println("--- ROBOT ACTION ---");
          Serial.println("Command: " + cmd);
          Serial.println("Direction: " + dir);
          
          // TODO: Add motor control logic here based on cmd and dir
          if (cmd == "move") {
             if (dir == "forward") {
                // Motor forward
                Serial.println("=> Moving Forward");
             } else if (dir == "spin_around") {
                // Spin around fallback
                Serial.println("=> Spinning Around");
             }
          }
          Serial.println("--------------------");
        }
      }
      break;
    }
    case WStype_BIN:
      // Audio or binary data
      Serial.printf("[WSc] get binary length: %u\n", length);
      break;
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- Chibi-Moe Robot Firmware Starting ---");

  // 1. Load Configuration
  if (!loadConfig()) {
    Serial.println("CRITICAL: Cannot proceed without config.json");
    while (1) delay(1000); // Halt
  }

  // 2. Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(wifi_ssid);
  WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // 3. Connect to WebSocket Backend
  // Bypass SSL certificate validation for ease of development
  // IMPORTANT: For production, consider using setCACert()
  webSocket.beginSSL(websocket_host.c_str(), websocket_port, websocket_path.c_str(), "", "wss");
  
  // Register the event handler
  webSocket.onEvent(webSocketEvent);
  
  // Automatically reconnect if connection is lost
  webSocket.setReconnectInterval(5000);
  
  Serial.println("WebSocket initialization complete.");
}

void loop() {
  webSocket.loop();
  // TODO: Add sensor reading and other non-blocking loop code here
}
