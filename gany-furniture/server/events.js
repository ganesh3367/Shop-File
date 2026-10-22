import { EventEmitter } from 'node:events';

/**
 * In-process event bus for live admin alerts (new orders, returns, reviews, messages).
 * Admin browsers subscribe through a Server-Sent Events stream in routes/admin.js.
 */
export const bus = new EventEmitter();
bus.setMaxListeners(100);

export const notifyAdmins = (type, payload) => bus.emit('event', { type, payload, at: new Date().toISOString() });
