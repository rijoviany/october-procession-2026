import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { createApiRouter } from './routes.js';
import { store } from './db.js';

const app = express();
const server = http.createServer(app);

// Enable CORS for local dev and production
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  
  // Send current state immediately upon connection
  socket.emit('procession:init', store.getData());

  // Listen for admin live broadcast coordinates via socket
  socket.on('location:broadcast', (locationPayload) => {
    const data = store.getData();
    data.currentLocation = {
      coordinates: locationPayload.coordinates,
      updatedAt: new Date().toISOString(),
      source: locationPayload.source || 'gps',
      accuracy: locationPayload.accuracy,
      heading: locationPayload.heading,
      speed: locationPayload.speed,
    };
    store.saveData();
    // Broadcast to all other listeners
    socket.broadcast.emit('location:updated', data.currentLocation);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// API Routes
app.use('/api', createApiRouter(io));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend dist if available
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🕊️ Mother Mary Procession Tracker Server is running!`);
  console.log(`📡 API & WebSocket Server: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
