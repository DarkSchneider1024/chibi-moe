#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <WiFiManager.h>
#include "esp_camera.h"
#include <time.h>

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

#define BOOT_BUTTON_PIN 0    // BOOT button = GPIO0 (built-in on ESP32-S3)

String websocket_host = "chibi.carrot-atelier.online";
int websocket_port = 443;
String websocket_path = "/";
bool websocket_secure = true;
bool shouldSaveConfig = false;

WebSocketsClient webSocket;
bool camera_initialized = false;
bool camera_enabled = true; // User toggleable camera stream
unsigned long last_frame_time = 0;

void normalizeWebSocketConfig() {
  websocket_host.trim();
  websocket_path.trim();

  if (websocket_host.startsWith("wss://")) {
    websocket_secure = true;
    websocket_port = websocket_port == 80 ? 443 : websocket_port;
    websocket_host = websocket_host.substring(6);
  } else if (websocket_host.startsWith("ws://")) {
    websocket_secure = false;
    websocket_port = websocket_port == 443 ? 80 : websocket_port;
    websocket_host = websocket_host.substring(5);
  } else {
    websocket_secure = websocket_port == 443;
  }

  int slashIndex = websocket_host.indexOf('/');
  if (slashIndex >= 0) {
    websocket_path = websocket_host.substring(slashIndex);
    websocket_host = websocket_host.substring(0, slashIndex);
  }

  int colonIndex = websocket_host.lastIndexOf(':');
  if (colonIndex > 0) {
    websocket_port = websocket_host.substring(colonIndex + 1).toInt();
    websocket_host = websocket_host.substring(0, colonIndex);
    websocket_secure = websocket_port == 443;
  }

  if (websocket_path.length() == 0 || websocket_path[0] != '/') {
    websocket_path = "/" + websocket_path;
  }
}

void syncClockForTls() {
  configTime(0, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");

  Serial.print("Waiting for NTP time sync");
  time_t now = time(nullptr);
  unsigned long startedAt = millis();
  while (now < 1700000000 && millis() - startedAt < 15000) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println();

  if (now < 1700000000) {
    Serial.println("NTP sync timed out; WSS certificate validation may fail.");
  } else {
    Serial.println("NTP time synchronized.");
  }
}

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
          if (doc.containsKey("websocket_path")) {
             websocket_path = doc["websocket_path"].as<String>();
          }
          normalizeWebSocketConfig();
          Serial.println("Config loaded successfully:");
          Serial.println("WS Host: " + websocket_host + ":" + String(websocket_port) + websocket_path);
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
  doc["websocket_path"] = websocket_path;

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
    config.frame_size = FRAMESIZE_QVGA;
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
          String emotion = doc["emotion"].as<String>();
          int duration = doc["duration"] | 0;
          
          Serial.println("--- ROBOT ACTION ---");
          Serial.println("Command: " + cmd);
          Serial.println("Direction: " + dir);
          Serial.println("Duration: " + String(duration));
          
          if (cmd == "move") {
             if (dir == "forward") {
                Serial.println("=> Moving Forward");
             } else if (dir == "backward") {
                Serial.println("=> Moving Backward");
             } else if (dir == "left") {
                Serial.println("=> Turning Left");
             } else if (dir == "right") {
                Serial.println("=> Turning Right");
             } else if (dir == "dance") {
                Serial.println("=> Dancing");
             } else if (dir == "spin_around") {
                Serial.println("=> Spinning Around");
             }
          } else if (cmd == "expression") {
             Serial.println("=> Expression: " + emotion);
          }
          Serial.println("--------------------");
        } else if (msgType == "camera_control") {
          camera_enabled = doc["enabled"].as<bool>();
          Serial.print("Camera Stream Enabled: ");
          Serial.println(camera_enabled ? "true" : "false");
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

  // === BOOT Button: Long-press (3s) to reset WiFi + Config ===
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  if (digitalRead(BOOT_BUTTON_PIN) == LOW) {
    Serial.println("[RESET] BOOT button held. Hold 3s to reset WiFi & config...");
    int held = 0;
    while (digitalRead(BOOT_BUTTON_PIN) == LOW && held < 30) {
      delay(100);
      held++;
      Serial.print(".");
    }
    Serial.println();
    if (held >= 30) {
      Serial.println("[RESET] Clearing WiFi credentials and LittleFS config!");
      WiFiManager wm;
      wm.resetSettings();          // Clear WiFi SSID/password
      LittleFS.begin(true);        // Mount
      LittleFS.remove("/config.json"); // Delete WS config
      LittleFS.end();
      Serial.println("[RESET] Done! Rebooting into setup AP: Chibi-Moe-Setup");
      delay(1000);
      ESP.restart();
    } else {
      Serial.println("[RESET] Button released early. Normal boot.");
    }
  }


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
  WiFi.setSleep(false);

  // Save config if it was updated in the captive portal
  if (shouldSaveConfig) {
    websocket_host = custom_server_ip.getValue();
    websocket_port = atoi(custom_server_port.getValue());
    normalizeWebSocketConfig();
    saveConfig();
  } else {
    // Overwrite the in-memory variable in case it was changed without triggering save
    websocket_host = custom_server_ip.getValue(); 
    websocket_port = atoi(custom_server_port.getValue());
    normalizeWebSocketConfig();
  }

  // 4. Connect to WebSocket Backend
  if (websocket_secure) {
    Serial.println("Using WSS (SSL) for WebSocket connection.");
    syncClockForTls();
    // TODO: Let's Encrypt now uses YR1→Root YR→ISRG Root X1 chain.
    // beginSslWithCA with only ISRG Root X1 fails because nginx doesn't send Root YR.
    // Using beginSSL (setInsecure) as a pragmatic fix for home IoT use.
    // Proper fix: add Root YR cert or use a full CA bundle.
    webSocket.beginSSL(websocket_host.c_str(), websocket_port, websocket_path.c_str());
  } else {
    Serial.println("Using WS (non-SSL) for WebSocket connection.");
    webSocket.begin(websocket_host.c_str(), websocket_port, websocket_path.c_str());
  }
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(15000, 3000, 2);
  
  Serial.println("WebSocket initialization complete.");
}

void loop() {
  webSocket.loop();
  
  // Stream camera frames if connected and enabled
  if (camera_initialized && camera_enabled && webSocket.isConnected()) {
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
