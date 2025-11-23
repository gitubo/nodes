// src/Widget.js
import { store } from './state.js';
import { render, initRenderer } from './render.js';
import { Grid } from './Grid.js';
import { eventBus } from './EventBus.js';
import { CONFIG } from './config.js';
import { uiController } from './UIController.js';

export class DAGWidget {
    constructor(containerSelector, config = {}) {
        this.container = typeof containerSelector === 'string' 
            ? document.querySelector(containerSelector) 
            : containerSelector;

        if (!this.container) throw new Error(`Container ${containerSelector} not found`);

        this.config = {
            width: '100%',
            height: '100%',
            ...config
        };

        this.subscribers = new Set();
        this.zoomBehavior = null;

        this._initDOM();
        this._initSystem();
        this._setupEventBridge();
    }

    /**
     * INBOUND: Dispatch commands.
     * Note: Getters will return data synchronously.
     */
    dispatch(commandName, payload = {}) {
        switch (commandName) {
            // --- Node Commands ---
            case 'create_node':
                return store.addNode(payload.type || 'task', payload.x || 0, payload.y || 0, payload.data || {});
            
            case 'delete_node':
                if (payload.id) store.removeNode(payload.id);
                break;
            
            case 'update_node':
                if (payload.id) store.updateNode(payload.id, payload);
                break;
            
            case 'get_node':
                return payload.id ? store.getNode(payload.id) : null;

            // --- Link Commands ---
            case 'create_link':
                if (payload.source && payload.target) store.addLink(payload.source, payload.target);
                break;
            
            case 'delete_link':
                if (payload.id) store.removeLink(payload.id);
                break;
            
            case 'update_link':
                if (payload.id) store.updateLink(payload.id, payload);
                break;
            
            case 'get_link':
                return payload.id ? store.getLink(payload.id) : null;

            // --- Selection Commands ---
            case 'select':
                if (payload.type && payload.id) store.selectObject(payload.type, { id: payload.id });
                break;
            
            case 'deselect':
                store.deselect();
                break;

            // --- Viewport Commands ---
            case 'zoom_in':
                this._zoomCall(1.3);
                break;
            case 'zoom_out':
                this._zoomCall(0.7);
                break;
            case 'zoom_reset':
                this._zoomReset();
                break;
            case 'zoom_fit':
                uiController.fitToScreen();
                break;

            // --- IO Commands ---
            case 'export':
                const data = store.serialize();
                this._notifySubscribers('EXPORT_READY', data);
                return data; // Also return synchronously
            
            case 'import':
                if (payload) store.deserialize(payload);
                break;

            default:
                console.warn(`[DAGWidget] Unknown command: ${commandName}`);
        }
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    _initDOM() {
        this.container.innerHTML = '';
        this.container.style.width = this.config.width;
        this.container.style.height = this.config.height;
        this.container.style.overflow = 'hidden';
        this.container.style.position = 'relative';
        this.container.style.backgroundColor = CONFIG.canvas.backgroundColor;

        const svg = d3.select(this.container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%");

        svg.append("defs").html(`
            <linearGradient id="node-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#e8e8e8"/>
            </linearGradient>
        `);

        const viewport = svg.append("g").attr("class", "viewport");
        viewport.append("g").attr("class", "grid-layer");
        viewport.append("g").attr("class", "helper-layer");
        viewport.append("g").attr("class", "link-layer");
        viewport.append("g").attr("class", "label-layer");
        viewport.append("g").attr("class", "node-layer");

        Grid.render(viewport.select(".grid-layer"), CONFIG.canvas.width, CONFIG.canvas.height);

        this.zoomBehavior = d3.zoom()
            .scaleExtent([CONFIG.zoom.min, CONFIG.zoom.max])
            .on("zoom", ({ transform }) => {
                viewport.attr("transform", transform);
                store.transform = transform;
            });
        
        svg.call(this.zoomBehavior);
        window.zoomBehavior = this.zoomBehavior;

        svg.on("click", (e) => {
            if (e.target === svg.node()) store.deselect();
        });

        this.svg = svg;
    }

    _initSystem() {
        store.initializeWithDefaults(); 
        uiController.initialize();
        initRenderer();
        render(); 
    }

    _setupEventBridge() {
        const internalEvents = [
            'NODE_CREATED', 'NODE_UPDATED', 'NODE_REMOVED', 'NODE_MOVED',
            'CONNECTION_CREATED', 'CONNECTION_UPDATED', 'CONNECTION_REMOVED',
            'SELECTION_CHANGED', 'DESELECTION'
        ];

        internalEvents.forEach(evtName => {
            eventBus.on(evtName, (payload) => {
                this._notifySubscribers(evtName, payload);
            });
        });
    }

    _notifySubscribers(eventType, payload) {
        this.subscribers.forEach(fn => fn(eventType, payload));
    }

    _zoomCall(scaleFactor) {
        if (this.svg && this.zoomBehavior) {
            this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, scaleFactor);
        }
    }

    _zoomReset() {
        if (this.svg && this.zoomBehavior) {
            this.svg.transition().duration(300).call(this.zoomBehavior.transform, d3.zoomIdentity);
        }
    }
}