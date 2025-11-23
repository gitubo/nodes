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

        // Configuration Merge
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

    // =================================================================
    //  PUBLIC API: Message Bridge
    // =================================================================

    /**
     * INBOUND: Single entry point for all commands.
     * @param {string} commandName - The action to perform (e.g., 'ADD_NODE')
     * @param {any} payload - Data required for the command
     */
    dispatch(commandName, payload = {}) {
        // console.log(`[Bridge-In] ${commandName}`, payload); // Optional Debug

        switch (commandName) {
            // --- Node Commands ---
            case 'ADD_NODE':
                store.addNode(payload.type || 'task', payload.x || 0, payload.y || 0, payload.data || {});
                break;
            case 'REMOVE_NODE':
                if (payload.id) store.removeNode(payload.id);
                break;
            case 'UPDATE_NODE':
                if (payload.id) store.updateNode(payload.id, payload);
                break;

            // --- Link Commands ---
            case 'ADD_LINK':
                if (payload.source && payload.target) store.addLink(payload.source, payload.target);
                break;
            case 'REMOVE_LINK':
                if (payload.id) store.removeLink(payload.id);
                break;
            case 'UPDATE_LINK':
                if (payload.id) store.updateLink(payload.id, payload);
                break;

            // --- Selection Commands ---
            case 'SELECT':
                if (payload.type && payload.id) store.selectObject(payload.type, { id: payload.id });
                break;
            case 'DESELECT':
                store.deselect();
                break;

            // --- Viewport Commands ---
            case 'ZOOM_IN':
                this._zoomCall(1.3);
                break;
            case 'ZOOM_OUT':
                this._zoomCall(0.7);
                break;
            case 'ZOOM_RESET':
                this._zoomReset();
                break;
            case 'ZOOM_FIT':
                uiController.fitToScreen(); // Reusing existing logic
                break;

            // --- IO Commands ---
            case 'EXPORT':
                // Asynchronously emits EXPORT_READY via the bridge
                const data = store.serialize();
                this._notifySubscribers('EXPORT_READY', data);
                break;
            case 'IMPORT':
                if (payload) store.deserialize(payload);
                break;

            default:
                console.warn(`[DAGWidget] Unknown command: ${commandName}`);
        }
    }

    /**
     * OUTBOUND: Single exit point for all events.
     * @param {Function} callback - (eventType, payload) => void
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        // Return unsubscribe function
        return () => this.subscribers.delete(callback);
    }

    // =================================================================
    //  INTERNAL: System Setup
    // =================================================================

    _initDOM() {
        this.container.innerHTML = '';
        this.container.style.width = this.config.width;
        this.container.style.height = this.config.height;
        this.container.style.overflow = 'hidden';
        this.container.style.position = 'relative';
        this.container.style.backgroundColor = CONFIG.canvas.backgroundColor;

        // Create SVG structure
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

        // Setup Zoom
        this.zoomBehavior = d3.zoom()
            .scaleExtent([CONFIG.zoom.min, CONFIG.zoom.max])
            .on("zoom", ({ transform }) => {
                viewport.attr("transform", transform);
                store.transform = transform;
            });
        
        svg.call(this.zoomBehavior);
        window.zoomBehavior = this.zoomBehavior; // For UIController access

        // Background Click (Deselect)
        svg.on("click", (e) => {
            if (e.target === svg.node()) store.deselect();
        });

        this.svg = svg;
    }

    _initSystem() {
        store.initializeWithDefaults(); // Or leave empty if preferred
        uiController.initialize();
        initRenderer();
        render(); // Initial paint
    }

    _setupEventBridge() {
        // List of internal events to forward to the outside world
        const internalEvents = [
            'NODE_CREATED', 
            'NODE_UPDATED', 
            'NODE_REMOVED', 
            'NODE_MOVED',
            'CONNECTION_CREATED', 
            'CONNECTION_UPDATED',
            'CONNECTION_REMOVED',
            'SELECTION_CHANGED'
        ];

        internalEvents.forEach(evtName => {
            eventBus.on(evtName, (payload) => {
                // Normalize payload if necessary, or pass raw
                this._notifySubscribers(evtName, payload);
            });
        });
    }

    _notifySubscribers(eventType, payload) {
        this.subscribers.forEach(fn => fn(eventType, payload));
    }

    // --- Helper Logic ---

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