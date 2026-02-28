# ITI Online Data Analysis

**ITI Online Data Analysis** is a high-performance web application designed for processing, visualizing, and collaboratively analyzing massive quantities of time-series engineering data directly in the browser. 

Powered by **React**, **Next.js**, **Zustand**, **PixiJS (WebGL)**, and **Socket.io**, it parses and renders datasets that would typically crash a standard web application.

---

## 🌟 Key Features

### 1. High-Density Waveform Rendering (VCTM Engine)
- Renders **hundreds of thousands of data points** mapped to numerous overlapping signal lines simultaneously.
- Built on a custom **View-Centered Time Mapping (VCTM)** architecture wrapping **PixiJS (WebGL)** to ensure silky-smooth panning and zooming at 60 FPS.
- Microsecond-level cursor snapping and crosshair measurements across all visible signals.

### 2. Intelligent Data Parsing (Local & Secure)
- Fast streaming imports for massive `.csv` and `.xlsx` files using Web Workers (`Comlink`) and chunked parsers.
- **Manual Column Mapping UI**: If the automated heuristic fails to find the timestamp axis, you can specify exactly which column drives the `X` axis.
- **IndexedDB Caching**: Files parsed once are stored in the browser's persistent cache. Re-uploading the exact same file results in instantaneous "Lightning Load" restoration.

### 3. Real-Time Collaboration
- Upload a file, and the application instantly **broadcasts the entire dataset natively over WebSocket** to all connected peers in the same room.
- Crosshairs and selections synchronize exactly to logical `Time` and `Value` coords. A colleague on a 4K monitor sees the precise data hover as someone on a 1080p laptop.
- Visibility checkboxes toggle dynamically across all clients.

### 4. Professional Export & Reporting
- Generate rich **PDF Reports** with instantaneous waveform snapshots (`jspdf`, `html2canvas`).
- Export specific time-series signal curves natively back to standard `.xlsx`.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or newer matching your version manager)
- `npm` or `yarn`

### Installation
1. Install standard dependencies:
   ```bash
   npm install
   ```
2. *(Optional)* Install optional WebSocket server dependencies if running in a detached mode:
   ```bash
   cd server && npm install
   cd ..
   ```

### Running the Environment

This application requires **two processes** to function with its full collaborative features.

**1. Start the Next.js Frontend Development Server**
```bash
npm run dev
```
The website will boot at `http://localhost:3000`.

**2. Start the Socket.io WebSocket Backend**
```bash
npm run dev:socket
```
This boots the standalone Node.js server on `http://localhost:3001` (configured to allow up to 100MB chunk broadcasts for MVP data sync).

---

## 📖 Architecture Overview

- `src/components/renderer`: Contains the PixiJS `WaveformView` representing the core visual canvas.
- `src/components/analysis`: Contains UI-binding logic for data extraction and manual parameter controls (upload, signals, checkboxes, collaboration cursors).
- `src/store`: The centralized **Zustand** state engine combining the local `VCTMState` and socket-driven `CollaborationState`.
- `src/lib/workers`: Houses the **Web Worker** bridge (`parser.worker.ts`) to offload intensive `.csv`/`.xlsx` array parsing away from the UI thread.
- `server/index.js`: The detached collaboration state mirror handling Socket.IO routing.

## ⚡ Stress Testing
The application ships with a built-in benchmark layer. Click the `Stress: 100` or `Stress: 500` buttons located in the application header to dynamically inject dense sine, square, and triangle waves into the VCTM engine and test your local graphical hardware capabilities.
