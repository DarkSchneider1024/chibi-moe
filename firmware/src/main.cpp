#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <WiFiManager.h>
#include "esp_camera.h"

// GOOUUU ESP32-S3-CAM pin configuration
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     15
#define SIOD_GPIO_NUM      4
#define SIOC_GPIO_NUM      5

#define Y9_GPIO_NUM       16
#define Y8_GPIO_NUM       17
#define Y7_GPIO_NUM       18
#define Y6_GPIO_NUM       12
#define Y5_GPIO_NUM       10
#define Y4_GPIO_NUM        8
#define Y3_GPIO_NUM        9
#define Y2_GPIO_NUM       11
#define VSYNC_GPIO_NUM     6
#define HREF_GPIO_NUM      7
#define PCLK_GPIO_NUM     13

// Global config variables
const char* ISGR_ROOT_X1_CA = \
"-----BEGIN CERTIFICATE-----\n" \
"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\n" \
"-----END CERTIFICATE-----\n";

String websocket_host = "192.168.1.100";
int websocket_port = 3001;
String websocket_path = "/";
bool shouldSaveConfig = false;

WebSocketsClient webSocket;
bool camera_initialized = false;
unsigned long last_frame_time = 0;

// Callback notifying us of the need to save config
void saveConfigCallback () {
  Serial.println("Should save config");
  shouldSaveConfig = true;
}

// Load config from LittleFS
void loadConfig() {
  if (LittleFS.begin(true)) {
    if (LittleFS.exists("/config.json")) {
      File file = LittleFS.open("/config.json", "r");
      if (file) {
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, file);
        if (!error) {
          if (doc.containsKey("websocket_host")) {
             websocket_host = doc["websocket_host"].as<String>();
          }
          if (doc.containsKey("websocket_port")) {
             websocket_port = doc["websocket_port"].as<int>();
          }
          Serial.println("Config loaded successfully:");
          Serial.println("WS Host: " + websocket_host + ":" + String(websocket_port));
        }
        file.close();
      }
    }
  } else {
    Serial.println("LittleFS Mount Failed");
  }
}

// Save config to LittleFS
void saveConfig() {
  Serial.println("Saving config");
  StaticJsonDocument<512> doc;
  doc["websocket_host"] = websocket_host;
  doc["websocket_port"] = websocket_port;

  File file = LittleFS.open("/config.json", "w");
  if (!file) {
    Serial.println("Failed to open config file for writing");
  } else {
    serializeJson(doc, file);
    file.close();
  }
}

// Camera Initialization
void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG; // Stream JPEG

  // Init with high specs to pre-allocate larger buffers
  if(psramFound()){
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return;
  }
  
  camera_initialized = true;
  Serial.println("Camera initialized successfully!");
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
          
          // Add motor control logic here based on cmd and dir
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
      // Audio or binary data coming from server (if any)
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
  loadConfig();

  // 2. Initialize Camera
  initCamera();

  // 3. WiFiManager Setup
  WiFiManager wifiManager;
  wifiManager.setSaveConfigCallback(saveConfigCallback);

  // Add custom parameter for Server IP/Host
  WiFiManagerParameter custom_server_ip("server", "Server IP/Host", websocket_host.c_str(), 40);
  wifiManager.addParameter(&custom_server_ip);

  // Add custom parameter for Server Port
  char port_str[6];
  sprintf(port_str, "%d", websocket_port);
  WiFiManagerParameter custom_server_port("port", "Server Port", port_str, 6);
  wifiManager.addParameter(&custom_server_port);

  // Start Captive Portal if not connected
  Serial.println("Starting WiFiManager. Connect to 'Chibi-Moe-Setup' if needed.");
  if (!wifiManager.autoConnect("Chibi-Moe-Setup")) {
    Serial.println("Failed to connect and hit timeout");
    delay(3000);
    ESP.restart(); // Reset and try again
  }

  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Save config if it was updated in the captive portal
  if (shouldSaveConfig) {
    websocket_host = custom_server_ip.getValue();
    websocket_port = atoi(custom_server_port.getValue());
    saveConfig();
  } else {
    // Overwrite the in-memory variable in case it was changed without triggering save
    websocket_host = custom_server_ip.getValue(); 
    websocket_port = atoi(custom_server_port.getValue());
  }

  // 4. Connect to WebSocket Backend
  if (websocket_port == 443) {
    Serial.println("Using WSS (SSL) for WebSocket connection.");
    // For ESP32, beginSslWithCA is available in WebSocketsClient for WSS connections with root CA validation
    webSocket.beginSslWithCA(websocket_host.c_str(), websocket_port, websocket_path.c_str(), ISGR_ROOT_X1_CA, "wss");
  } else {
    Serial.println("Using WS (non-SSL) for WebSocket connection.");
    webSocket.begin(websocket_host.c_str(), websocket_port, websocket_path.c_str());
  }
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  
  Serial.println("WebSocket initialization complete.");
}

void loop() {
  webSocket.loop();
  
  // Stream camera frames if connected
  if (camera_initialized && webSocket.isConnected()) {
    // Send 10 frames per second (every 100ms)
    if (millis() - last_frame_time > 100) {
      last_frame_time = millis();
      
      camera_fb_t * fb = esp_camera_fb_get();
      if (!fb) {
        Serial.println("Camera capture failed");
        return;
      }
      
      // Send the JPEG buffer as binary data over WebSocket
      webSocket.sendBIN(fb->buf, fb->len);
      
      // Return the frame buffer back to the driver for reuse
      esp_camera_fb_return(fb);
    }
  }
}
