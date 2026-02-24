/**
 * sse.ts
 * Server-Sent Events bus — push trade events to all connected frontend clients.
 * Frontend subscribes via GET /api/events and receives instant trade notifications.
 */

import type { Response } from 'express';

const clients = new Set<Response>();

export function addSSEClient(res: Response): () => void {
    clients.add(res);
    return () => clients.delete(res);
}

export function pushTradeEvent(type: 'trade:open' | 'trade:close', trade: object): void {
    if (clients.size === 0) return;
    const payload = `data: ${JSON.stringify({ type, ...trade })}\n\n`;
    for (const client of clients) {
        try { client.write(payload); } catch { clients.delete(client); }
    }
}

export function pushStatsUpdate(): void {
    if (clients.size === 0) return;
    const payload = `data: ${JSON.stringify({ type: 'stats:update' })}\n\n`;
    for (const client of clients) {
        try { client.write(payload); } catch { clients.delete(client); }
    }
}
