#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
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
String wifi_ssid = "";
String wifi_password = "";
String websocket_host = "";
int websocket_port = 443;
String websocket_path = "/";

WebSocketsClient webSocket;
bool camera_initialized = false;
unsigned long last_frame_time = 0;

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
  if (!loadConfig()) {
    Serial.println("CRITICAL: Cannot proceed without config.json");
    while (1) delay(1000); // Halt
  }

  // 2. Initialize Camera
  initCamera();

  // 3. Connect to Wi-Fi
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

  // 4. Connect to WebSocket Backend
  webSocket.beginSSL(websocket_host.c_str(), websocket_port, websocket_path.c_str(), "", "wss");
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
