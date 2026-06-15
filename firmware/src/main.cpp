#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <WiFiManager.h>
#include "esp_camera.h"
#include <time.h>
#include <driver/i2s.h>
#include "mbedtls/base64.h"

// Audio libraries
#include "AudioFileSourcePROGMEM.h"
#include "AudioGeneratorMP3.h"
#include "AudioOutputI2S.h"

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

#define BOOT_BUTTON_PIN   0    // BOOT button = GPIO0

// Audio Output (Speaker / MAX98357A) I2S Pins
#define SPK_I2S_BCLK      2
#define SPK_I2S_LRC       1
#define SPK_I2S_DIN       42

// Audio Input (Microphone / INMP441) I2S Pins & Port
#define MIC_I2S_PORT      I2S_NUM_1
#define MIC_I2S_SCK       41
#define MIC_I2S_WS        40
#define MIC_I2S_SD        39
#define RECORD_SAMPLE_RATE 16000

// Recording State
#define MAX_RECORD_SAMPLES (RECORD_SAMPLE_RATE * 8) // 8 seconds max
int16_t* record_buffer = nullptr;
size_t recorded_samples = 0;
bool is_recording = false;
bool last_button_state = HIGH;
unsigned long record_start_time = 0;

// Motor Driver Pins (L9110S / MX1508 / L298N)
#define MOTOR_L_PIN1      19
#define MOTOR_L_PIN2      20
#define MOTOR_R_PIN1      21
#define MOTOR_R_PIN2      47

unsigned long motor_stop_time = 0;

void controlMotors(String direction) {
  if (direction == "forward") {
    digitalWrite(MOTOR_L_PIN1, HIGH);
    digitalWrite(MOTOR_L_PIN2, LOW);
    digitalWrite(MOTOR_R_PIN1, HIGH);
    digitalWrite(MOTOR_R_PIN2, LOW);
  } else if (direction == "backward") {
    digitalWrite(MOTOR_L_PIN1, LOW);
    digitalWrite(MOTOR_L_PIN2, HIGH);
    digitalWrite(MOTOR_R_PIN1, LOW);
    digitalWrite(MOTOR_R_PIN2, HIGH);
  } else if (direction == "left") {
    digitalWrite(MOTOR_L_PIN1, LOW);
    digitalWrite(MOTOR_L_PIN2, HIGH);
    digitalWrite(MOTOR_R_PIN1, HIGH);
    digitalWrite(MOTOR_R_PIN2, LOW);
  } else if (direction == "right") {
    digitalWrite(MOTOR_L_PIN1, HIGH);
    digitalWrite(MOTOR_L_PIN2, LOW);
    digitalWrite(MOTOR_R_PIN1, LOW);
    digitalWrite(MOTOR_R_PIN2, HIGH);
  } else if (direction == "spin") {
    digitalWrite(MOTOR_L_PIN1, HIGH);
    digitalWrite(MOTOR_L_PIN2, LOW);
    digitalWrite(MOTOR_R_PIN1, LOW);
    digitalWrite(MOTOR_R_PIN2, HIGH);
  } else {
    digitalWrite(MOTOR_L_PIN1, LOW);
    digitalWrite(MOTOR_L_PIN2, LOW);
    digitalWrite(MOTOR_R_PIN1, LOW);
    digitalWrite(MOTOR_R_PIN2, LOW);
  }
}

// MP3 Playback Variables
AudioFileSourcePROGMEM *fileSource = nullptr;
AudioGeneratorMP3 *mp3 = nullptr;
AudioOutputI2S *mp3Out = nullptr;
uint8_t* mp3_decode_buffer = nullptr;
const size_t MP3_DECODE_BUFFER_SIZE = 192 * 1024; // 192KB

// Global config variables
const char* ISGR_ROOT_X1_CA = \
"-----BEGIN CERTIFICATE-----\n" \
"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\n" \
"-----END CERTIFICATE-----\n";

String websocket_host = "chibi.carrot-atelier.online";
int websocket_port = 443;
String websocket_path = "/";
bool websocket_secure = true;
bool shouldSaveConfig = false;

WebSocketsClient webSocket;
bool camera_initialized = false;
bool camera_enabled = true;
unsigned long last_frame_time = 0;

// Base64 Helpers
String base64Encode(const uint8_t* data, size_t length) {
  size_t out_len = 0;
  mbedtls_base64_encode(nullptr, 0, &out_len, data, length);
  unsigned char* buf = (unsigned char*)malloc(out_len + 1);
  if (!buf) return "";
  mbedtls_base64_encode(buf, out_len, &out_len, data, length);
  buf[out_len] = '\0';
  String res = String((char*)buf);
  free(buf);
  return res;
}

size_t base64Decode(const String& input, uint8_t* output, size_t max_len) {
  size_t out_len = 0;
  int ret = mbedtls_base64_decode(output, max_len, &out_len, (const unsigned char*)input.c_str(), input.length());
  if (ret != 0) return 0;
  return out_len;
}

// WAV Header Writer
void writeWavHeader(uint8_t* header, uint32_t totalDataLen) {
  uint32_t totalFileSize = totalDataLen + 36;
  uint32_t byteRate = RECORD_SAMPLE_RATE * 2; // 16-bit mono

  header[0] = 'R'; header[1] = 'I'; header[2] = 'F'; header[3] = 'F';
  header[4] = (totalFileSize & 0xff);
  header[5] = ((totalFileSize >> 8) & 0xff);
  header[6] = ((totalFileSize >> 16) & 0xff);
  header[7] = ((totalFileSize >> 24) & 0xff);
  header[8] = 'W'; header[9] = 'A'; header[10] = 'V'; header[11] = 'E';
  header[12] = 'f'; header[13] = 'm'; header[14] = 't'; header[15] = ' ';
  header[16] = 16; header[17] = 0; header[18] = 0; header[19] = 0;
  header[20] = 1; header[21] = 0;
  header[22] = 1; header[23] = 0;
  header[24] = (RECORD_SAMPLE_RATE & 0xff);
  header[25] = ((RECORD_SAMPLE_RATE >> 8) & 0xff);
  header[26] = ((RECORD_SAMPLE_RATE >> 16) & 0xff);
  header[27] = ((RECORD_SAMPLE_RATE >> 24) & 0xff);
  header[28] = (byteRate & 0xff);
  header[29] = ((byteRate >> 8) & 0xff);
  header[30] = ((byteRate >> 16) & 0xff);
  header[31] = ((byteRate >> 24) & 0xff);
  header[32] = 2; header[33] = 0;
  header[34] = 16; header[35] = 0;
  header[36] = 'd'; header[37] = 'a'; header[38] = 't'; header[39] = 'a';
  header[40] = (totalDataLen & 0xff);
  header[41] = ((totalDataLen >> 8) & 0xff);
  header[42] = ((totalDataLen >> 16) & 0xff);
  header[43] = ((totalDataLen >> 24) & 0xff);
}

// I2S Microphone Initialization
void initMicrophone() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = RECORD_SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT, // INMP441 uses 32-bit slot
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 1024,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = MIC_I2S_SCK,
    .ws_io_num = MIC_I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = MIC_I2S_SD
  };

  esp_err_t err = i2s_driver_install(MIC_I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("Failed to install I2S microphone driver: %d\n", err);
    return;
  }
  err = i2s_set_pin(MIC_I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("Failed to set I2S microphone pins: %d\n", err);
    return;
  }
  Serial.println("I2S Microphone initialized successfully!");
}

// Play MP3 audio from a buffer
void playMp3Audio(uint8_t* data, size_t size) {
  if (mp3 && mp3->isRunning()) {
    mp3->stop();
  }
  if (fileSource) delete fileSource;
  if (mp3Out) delete mp3Out;
  if (mp3) delete mp3;

  fileSource = new AudioFileSourcePROGMEM(data, size);
  mp3Out = new AudioOutputI2S();
  mp3Out->SetPinout(SPK_I2S_BCLK, SPK_I2S_LRC, SPK_I2S_DIN);
  mp3 = new AudioGeneratorMP3();
  
  if (mp3->begin(fileSource, mp3Out)) {
    Serial.println("MP3 playback started.");
  } else {
    Serial.println("Failed to start MP3 playback.");
  }
}

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

void configureReliableDns() {
  IPAddress primaryDns(8, 8, 8, 8);
  IPAddress secondaryDns(1, 1, 1, 1);
  Serial.println("Configuring DNS servers: 8.8.8.8, 1.1.1.1");
  if (!WiFi.config(WiFi.localIP(), WiFi.gatewayIP(), WiFi.subnetMask(), primaryDns, secondaryDns)) {
    Serial.println("DNS config failed; continuing with DHCP-provided DNS.");
  }
}

bool waitForWebSocketDns() {
  IPAddress resolvedIp;
  for (int attempt = 1; attempt <= 5; attempt++) {
    Serial.printf("Resolving WebSocket host %s (attempt %d/5)...\n", websocket_host.c_str(), attempt);
    if (WiFi.hostByName(websocket_host.c_str(), resolvedIp)) {
      Serial.print("WebSocket host resolved to: ");
      Serial.println(resolvedIp);
      return true;
    }
    delay(1000);
  }
  Serial.println("WebSocket host DNS resolution failed after retries.");
  return false;
}

void saveConfigCallback () {
  Serial.println("Should save config");
  shouldSaveConfig = true;
}

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
  config.pixel_format = PIXFORMAT_JPEG;

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

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WSc] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.printf("[WSc] Connected to url: %s\n", payload);
      webSocket.sendTXT("{\"type\":\"status\",\"state\":\"idle\",\"battery\":100}");
      break;
    case WStype_TEXT: {
      Serial.printf("[WSc] get text: %s\n", payload);
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
          if (cmd == "move") {
             if (dir == "forward") {
                Serial.println("=> Moving Forward");
                controlMotors("forward");
             } else if (dir == "backward") {
                Serial.println("=> Moving Backward");
                controlMotors("backward");
             } else if (dir == "left") {
                Serial.println("=> Turning Left");
                controlMotors("left");
             } else if (dir == "right") {
                Serial.println("=> Turning Right");
                controlMotors("right");
             } else if (dir == "dance" || dir == "spin_around") {
                Serial.println("=> Spinning/Dancing");
                controlMotors("spin");
             }
             if (duration > 0) {
                motor_stop_time = millis() + duration;
             } else {
                motor_stop_time = 0;
             }
          } else if (cmd == "expression") {
             Serial.println("=> Expression: " + emotion);
          } else if (cmd == "update_config") {
             Serial.println("=> Update Config Command received!");
             if (doc["args"].containsKey("websocket_host")) {
                websocket_host = doc["args"]["websocket_host"].as<String>();
             }
             if (doc["args"].containsKey("websocket_port")) {
                websocket_port = doc["args"]["websocket_port"].as<int>();
             }
             normalizeWebSocketConfig();
             saveConfig();
             Serial.println("Config updated via WebSocket Command. Restarting in 1s...");
             delay(1000);
             ESP.restart();
          }
          Serial.println("--------------------");
        } else if (msgType == "camera_control") {
          camera_enabled = doc["enabled"].as<bool>();
        } else if (msgType == "audio_out") {
          String base64Data = doc["data"].as<String>();
          if (mp3_decode_buffer) {
            size_t decoded_len = base64Decode(base64Data, mp3_decode_buffer, MP3_DECODE_BUFFER_SIZE);
            if (decoded_len > 0) {
              playMp3Audio(mp3_decode_buffer, decoded_len);
            } else {
              Serial.println("Base64 audio decoding failed");
            }
          }
        }
      }
      break;
    }
    case WStype_BIN:
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

  // Allocate buffers in PSRAM
  if (psramFound()) {
    record_buffer = (int16_t*)ps_malloc(MAX_RECORD_SAMPLES * sizeof(int16_t));
    mp3_decode_buffer = (uint8_t*)ps_malloc(MP3_DECODE_BUFFER_SIZE);
    if (!record_buffer || !mp3_decode_buffer) {
      Serial.println("PSRAM buffer allocation failed!");
    } else {
      Serial.println("PSRAM buffers allocated successfully!");
    }
  } else {
    Serial.println("PSRAM not found! Audio recording might be memory-constrained.");
  }

  pinMode(MOTOR_L_PIN1, OUTPUT);
  pinMode(MOTOR_L_PIN2, OUTPUT);
  pinMode(MOTOR_R_PIN1, OUTPUT);
  pinMode(MOTOR_R_PIN2, OUTPUT);
  controlMotors("stop");

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
      wm.resetSettings();
      LittleFS.begin(true);
      LittleFS.remove("/config.json");
      LittleFS.end();
      Serial.println("[RESET] Done! Rebooting into setup AP: Chibi-Moe-Setup");
      delay(1000);
      ESP.restart();
    } else {
      Serial.println("[RESET] Button released early. Normal boot.");
    }
  }

  loadConfig();
  initCamera();
  initMicrophone();

  WiFiManager wifiManager;
  wifiManager.setSaveConfigCallback(saveConfigCallback);

  WiFiManagerParameter custom_server_ip("server", "Server IP/Host", websocket_host.c_str(), 40);
  wifiManager.addParameter(&custom_server_ip);

  char port_str[6];
  sprintf(port_str, "%d", websocket_port);
  WiFiManagerParameter custom_server_port("port", "Server Port", port_str, 6);
  wifiManager.addParameter(&custom_server_port);

  Serial.println("Starting WiFiManager. Connect to 'Chibi-Moe-Setup' if needed.");
  if (!wifiManager.autoConnect("Chibi-Moe-Setup")) {
    Serial.println("Failed to connect and hit timeout");
    delay(3000);
    ESP.restart();
  }

  Serial.println("\nWiFi Connected!");
  WiFi.setSleep(false);
  configureReliableDns();

  if (shouldSaveConfig) {
    websocket_host = custom_server_ip.getValue();
    websocket_port = atoi(custom_server_port.getValue());
    normalizeWebSocketConfig();
    saveConfig();
  } else {
    websocket_host = custom_server_ip.getValue(); 
    websocket_port = atoi(custom_server_port.getValue());
    normalizeWebSocketConfig();
  }

  waitForWebSocketDns();
  if (websocket_secure) {
    Serial.println("Using WSS (SSL) for WebSocket connection.");
    syncClockForTls();
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

  // Motor stop timer check
  if (motor_stop_time > 0 && millis() >= motor_stop_time) {
    controlMotors("stop");
    motor_stop_time = 0;
  }

  // MP3 Audio loop
  if (mp3 && mp3->isRunning()) {
    if (!mp3->loop()) {
      mp3->stop();
      Serial.println("MP3 playback finished.");
    }
  }

  // BOOT button audio recording logic
  bool current_button_state = digitalRead(BOOT_BUTTON_PIN);
  if (current_button_state == LOW && last_button_state == HIGH) {
    // Button pressed: start recording
    if (!is_recording && record_buffer) {
      is_recording = true;
      recorded_samples = 0;
      record_start_time = millis();
      Serial.println("Recording started...");
      webSocket.sendTXT("{\"type\":\"status\",\"state\":\"recording\"}");
    }
  } else if (current_button_state == HIGH && last_button_state == LOW) {
    // Button released: stop and send recording
    if (is_recording) {
      is_recording = false;
      Serial.printf("Recording stopped. Recorded samples: %d\n", recorded_samples);
      
      if (recorded_samples > 1000) {
        // Send status back to processing
        webSocket.sendTXT("{\"type\":\"status\",\"state\":\"processing\"}");
        
        // Wrap recorded samples in a WAV container
        uint32_t wav_data_len = recorded_samples * sizeof(int16_t);
        size_t total_payload_size = 44 + wav_data_len;
        uint8_t* wav_payload = (uint8_t*)malloc(total_payload_size);
        
        if (wav_payload) {
          writeWavHeader(wav_payload, wav_data_len);
          memcpy(wav_payload + 44, record_buffer, wav_data_len);
          
          String base64Wav = base64Encode(wav_payload, total_payload_size);
          free(wav_payload);
          
          // Send to server
          StaticJsonDocument<2048> doc;
          doc["type"] = "audio";
          doc["format"] = "wav";
          doc["data"] = base64Wav;
          
          String jsonStr;
          serializeJson(doc, jsonStr);
          webSocket.sendTXT(jsonStr);
          Serial.println("Audio packet sent successfully.");
        } else {
          Serial.println("WAV serialization malloc failed!");
        }
      } else {
        Serial.println("Recording was too short, discarded.");
        webSocket.sendTXT("{\"type\":\"status\",\"state\":\"idle\"}");
      }
    }
  }
  last_button_state = current_button_state;

  // I2S Microphone Recording poll
  if (is_recording && recorded_samples < MAX_RECORD_SAMPLES) {
    size_t bytes_read = 0;
    static int32_t raw_i2s_buffer[256];
    
    // Read raw data from I2S mic
    i2s_read(MIC_I2S_PORT, raw_i2s_buffer, sizeof(raw_i2s_buffer), &bytes_read, 10);
    
    size_t samples_read = bytes_read / sizeof(int32_t);
    for (size_t i = 0; i < samples_read && recorded_samples < MAX_RECORD_SAMPLES; i++) {
      // Scale down 24-bit active audio to 16-bit
      record_buffer[recorded_samples++] = (int16_t)(raw_i2s_buffer[i] >> 14);
    }

    if (recorded_samples >= MAX_RECORD_SAMPLES) {
      Serial.println("Buffer full, stopping recording automatically.");
      // Trigger release event logic
      last_button_state = HIGH; 
    }
  }

  // Stream camera frames
  if (camera_initialized && camera_enabled && webSocket.isConnected() && !is_recording) {
    if (millis() - last_frame_time > 100) {
      last_frame_time = millis();
      camera_fb_t * fb = esp_camera_fb_get();
      if (!fb) {
        Serial.println("Camera capture failed");
        return;
      }
      webSocket.sendBIN(fb->buf, fb->len);
      esp_camera_fb_return(fb);
    }
  }
}
