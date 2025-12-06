import { createServer } from './server.js';
import { NETWORK } from '@wizard-zone/shared';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : NETWORK.DEFAULT_PORT;

const server = createServer();

server.listen(PORT, () => {
  console.log(`[Server] Wizard Zone server running on port ${PORT}`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
});
