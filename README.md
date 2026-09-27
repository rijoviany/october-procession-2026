# 🕊️ Mother Mary Village Procession Live Tracking & Pathway Web Application

A full-stack real-time web application designed for parish communities and villages to track the **Mother Mary Annual Feast Procession**. It allows parishioners to see the live current position of Mother Mary's statue, view scheduled house stations with dates and arrival times, and follow the custom village pathway.

---

## 🌟 Key Features

### 1. 🗺️ Public Parishioner View (`/`)
- **Real-Time Interactive Map**:
  - **Radiant Statue Marker**: Distinctive Marian icon with an animated beacon glow showing where the statue is right now.
  - **Custom House Station Pins**: Numbered sequence badges color-coded by status (🟢 Statue Here Now, 🔵 Upcoming, ⚫ Visited).
  - **Custom Procession Pathway**: Custom polyline connecting all village houses along streets and shortcuts.
  - **House Popups**: Parishioner family name, house number, scheduled date, arrival/departure times, prayer intentions/hymns, and a one-tap link to open direct directions in Google Maps.
  - **Tile Styles**: Switch easily between Street Map, High-Res Satellite Imagery, and Clean Contrast views.
- **Live Status Header Banner**:
  - Highlights **"Currently At"** (Family name, house number, station) with direct focus button.
  - Highlights **"Up Next"** (Next house and estimated arrival time).
  - Live announcement ticker and completion progress bar.
- **House Itinerary & Schedule Drawer**:
  - Filter by date (e.g. Day 1, Day 2 of the novena/feast).
  - Search by family name, house number, or road.
  - Chronological timeline cards. Clicking any house smoothly flies the map to that station.
  - Mobile-first, responsive touch drawer designed for parishioners following along on phones.

### 2. 🛡️ Admin & Coordinator Control Center (`/admin`)
- **PIN Protected**: Secure access (Default PIN: `1234`, configurable in Settings).
- **Live Location Controller**:
  - **Broadcast My Phone's GPS**: Committee member walking with the statue can tap **"Start Live GPS Broadcast"** — utilizes HTML5 Geolocation (`watchPosition`) with high accuracy to automatically broadcast continuous live coordinates to all villagers!
  - **Step-by-Step Advance**: One-tap buttons: **"Advance to Next Stop"** and **"Depart House / In Transit"**.
  - **Route Walking Simulator**: Built-in test tool to simulate the procession movement along the pathway for testing without walking.
- **Itinerary & Station Manager**:
  - **Add New House**: Enter family name, house number, address, date, arrival time, and prayer notes.
  - **Interactive Location Marking**: Click **"Pick on Map"** to set the exact coordinates directly on the map, or tap **"Use Phone GPS"** while standing at the house.
  - **Sequence Reordering**: Move houses Up or Down to adjust the procession sequence.
- **Automatic Pathway Builder**:
  - **Auto-Generate Route**: Calculates the walking route connecting all stops sequentially along village roads using edge road routing.
- **Dual Map Engine**:
  - Works immediately with high-resolution OSM / Esri satellite tiles with **zero configuration or credit card required**.
  - Supports Google Maps JavaScript API via the Admin Settings modal by entering your Google Maps API key.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server** (Runs both the real-time Express/WebSocket backend and Vite React frontend concurrently):
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API & WebSockets: `http://localhost:3001`

3. **Start Production Server**:
   ```bash
   npm run build
   npm start
   ```
   Opens on `http://localhost:3001`.

---

## 🔒 Security & Admin Access
- **Default Admin PIN**: `1234`
- To change the PIN, click **Admin** in the top navigation -> Enter PIN -> Click **Settings** in the Admin toolbar -> Update PIN.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Leaflet, Lucide Icons, Socket.IO Client.
- **Backend**: Node.js, Express, Socket.IO (WebSocket live updates), persistent JSON store.
- **Routing Engine**: OSRM Walking Engine + Direct Waypoint Connector.
