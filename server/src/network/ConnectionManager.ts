import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  ClientMessage,
  ClientMessageType,
  ServerMessageType,
  WelcomeMessage,
  PlayerId,
  NETWORK,
} from '@wizard-zone/shared';
import type { GameRoom } from '../game/GameRoom.js';

interface Connection {
  id: PlayerId;
  ws: WebSocket;
  playerName: string;
  isAlive: boolean;
}

export class ConnectionManager {
  private connections: Map<PlayerId, Connection> = new Map();
  private wsToPlayer: Map<WebSocket, PlayerId> = new Map();
  private gameRoom: GameRoom;

  constructor(gameRoom: GameRoom) {
    this.gameRoom = gameRoom;
    this.gameRoom.setBroadcaster((message) => this.broadcast(message));
  }

  handleConnection(ws: WebSocket): void {
    console.log('[ConnectionManager] New connection');

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('[ConnectionManager] Failed to parse message:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('[ConnectionManager] WebSocket error:', error);
      this.handleDisconnect(ws);
    });
  }

  private handleMessage(ws: WebSocket, message: ClientMessage): void {
    switch (message.type) {
      case ClientMessageType.JOIN_GAME:
        this.handleJoinGame(ws, message.playerName);
        break;

      case ClientMessageType.INPUT:
        const playerId = this.wsToPlayer.get(ws);
        if (playerId) {
          this.gameRoom.handleInput(playerId, message.input);
        }
        break;

      case ClientMessageType.PING:
        this.send(ws, {
          type: ServerMessageType.PONG,
          clientTime: message.clientTime,
          serverTime: Date.now(),
        });
        break;
    }
  }

  private handleJoinGame(ws: WebSocket, playerName: string): void {
    const playerId = uuidv4();

    const connection: Connection = {
      id: playerId,
      ws,
      playerName,
      isAlive: true,
    };

    this.connections.set(playerId, connection);
    this.wsToPlayer.set(ws, playerId);

    // Add player to game room
    this.gameRoom.addPlayer(playerId, playerName);

    // Send welcome message
    const welcome: WelcomeMessage = {
      type: ServerMessageType.WELCOME,
      playerId,
      serverTick: this.gameRoom.getCurrentTick(),
      tickRate: NETWORK.TICK_RATE,
    };

    this.send(ws, welcome);

    console.log(`[ConnectionManager] Player joined: ${playerName} (${playerId})`);
  }

  private handleDisconnect(ws: WebSocket): void {
    const playerId = this.wsToPlayer.get(ws);
    if (playerId) {
      const connection = this.connections.get(playerId);
      if (connection) {
        console.log(`[ConnectionManager] Player disconnected: ${connection.playerName}`);
        this.gameRoom.removePlayer(playerId);
      }
      this.connections.delete(playerId);
      this.wsToPlayer.delete(ws);
    }
  }

  private send(ws: WebSocket, message: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const connection of this.connections.values()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(data);
      }
    }
  }
}
