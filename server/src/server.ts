import express from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ConnectionManager } from './network/ConnectionManager.js';
import { GameRoom } from './game/GameRoom.js';

export function createServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Create the main game room
  const gameRoom = new GameRoom('main');
  const connectionManager = new ConnectionManager(gameRoom);

  wss.on('connection', (ws: WebSocket) => {
    connectionManager.handleConnection(ws);
  });

  // Start the game loop
  gameRoom.start();

  return httpServer;
}
