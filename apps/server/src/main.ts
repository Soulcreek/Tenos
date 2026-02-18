import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';

import { SERVER_PORT } from '@massless/shared';

import { ZoneRoom } from './rooms/ZoneRoom.js';

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define('zone', ZoneRoom);

httpServer.listen(SERVER_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[Massless] Server listening on ws://localhost:${SERVER_PORT}`);
});

export { gameServer };
