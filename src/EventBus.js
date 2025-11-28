export class EventBus {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        // Filter noisy events from logs if needed
        if (event !== 'GHOST_LINK_UPDATED' && event !== 'NODE_MOVED_HIGH_FREQ') {
            // console.log(`[EventBus] ${event}`, data);
        }

        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(data));
    }
}