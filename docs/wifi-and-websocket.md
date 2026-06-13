# WiFi and WebSocket setup

## Recommended portable setup

Use a phone hotspot as the robot WiFi when you want to carry Chibi-Moe around.

1. Enable the phone hotspot.
2. Keep the hotspot SSID and password stable.
3. Power on the robot.
4. If the robot opens the `Chibi-Moe-Setup` captive portal, connect to it and select the phone hotspot.
5. Set the backend to `wss://chibi.carrot-atelier.online`.

This keeps the robot on a network that travels with you, while the backend stays on the public cloud endpoint.

## Home or lab setup

Binding the robot to a fixed WiFi is fine for a home, office, or lab where the SSID is always available. It is less convenient for demos or travel because the robot will need WiFiManager setup again when that WiFi is not nearby.

## Backend URL rules

The firmware accepts either a host/port pair or a full WebSocket URL:

- `chibi.carrot-atelier.online` with port `443`
- `wss://chibi.carrot-atelier.online`
- `ws://192.168.1.10:3001` for local testing

Use `wss://` for production. Use `ws://` only for local testing on a trusted network.
