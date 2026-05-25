import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { WSEvent } from '@veda-ai/shared';

interface ConnectedClient {
  ws: WebSocket;
  subscriptions: Set<string>;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();

  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = Math.random().toString(36).slice(2, 10);
      this.clients.set(clientId, { ws, subscriptions: new Set() });
      console.log(`🔌 WS client connected: ${clientId} (total: ${this.clients.size})`);

      // Acknowledge connection
      ws.send(JSON.stringify({ type: 'CONNECTED', clientId }));

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'SUBSCRIBE' && msg.assignmentId) {
            const client = this.clients.get(clientId);
            if (client) {
              client.subscriptions.add(msg.assignmentId);
              ws.send(
                JSON.stringify({ type: 'SUBSCRIBED', assignmentId: msg.assignmentId })
              );
            }
          }
        } catch {
          // ignore malformed
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`🔌 WS client disconnected: ${clientId}`);
      });

      ws.on('error', (err) => {
        console.error(`WS client error [${clientId}]:`, err.message);
        this.clients.delete(clientId);
      });
    });

    console.log('✅ WebSocket server initialized on /ws');
  }

  broadcast(event: WSEvent): void {
    const payload = JSON.stringify(event);
    this.clients.forEach(({ ws, subscriptions }) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send to all subscribed clients or broadcast if no subscriptions
        if (subscriptions.has(event.assignmentId) || subscriptions.size === 0) {
          ws.send(payload);
        }
      }
    });
  }

  notifyAssignment(
    assignmentId: string,
    event: Omit<WSEvent, 'assignmentId'>
  ): void {
    this.broadcast({ ...event, assignmentId } as WSEvent);
  }
}

export const wsManager = new WebSocketManager();
