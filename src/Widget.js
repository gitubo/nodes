import { Store } from './state.js';
import { render, initRenderer, startRenderLoop } from './render.js';
import { Grid } from './Grid.js';
import { EventBus } from './EventBus.js'; // Import Class
import { CONFIG } from './config.js';
import { UIController } from './UIController.js';
import { SerializationService } from './SerializationService.js';
import { Registry, registerDefaultDefinitions } from './Registry.js'; // Import Class + Setup
import { InputSystem } from './InputSystem.js';
import { AddNodeHelperSystem } from './AddNodeHelper.js';

export class DAGWidget {
    constructor(containerSelector, config = {}) {
        this.container = typeof containerSelector === 'string' 
            ? document.querySelector(containerSelector) 
            : containerSelector;
        if (!this.container) throw new Error(`Container ${containerSelector} not found`);

        this.config = { width: '100%', height: '100%', ...config };
        this.subscribers = new Set();
        this.zoomBehavior = null;

        // --- 1. Instantiate Core Services (Dependency Injection) ---
        this.eventBus = new EventBus();
        this.registry = new Registry();
        
        // Populate default node types
        registerDefaultDefinitions(this.registry);

        this.serializationService = new SerializationService(this.registry);
        this.store = new Store(this.eventBus, this.serializationService, this.registry);

        // --- 2. Initialize DOM ---
        this._initDOM();

        // --- 3. Instantiate Controllers ---
        // Pass the instances created above
        this.inputSystem = new InputSystem(this.svg.node(), this.store, this.eventBus, this.registry);
        this.addNodeHelperSystem = new AddNodeHelperSystem(this.svg, this.store, this.registry, this.eventBus);
        this.uiController = new UIController(
            this.store, 
            this.eventBus, 
            this.serializationService, 
            this.registry,
            this.addNodeHelperSystem 
        );
        // --- 4. Initialize System ---
        this._initSystem();
        this._setupEventBridge();
        
        // Setup internal interactions
        this.inputSystem.attachEvents();
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

        // --- CRITICAL FIX FOR DRAG ---
        this.zoomBehavior = d3.zoom()
            .scaleExtent([CONFIG.zoom.min, CONFIG.zoom.max])
            .filter((event) => {
                // If the user clicks on these interactive elements, prevent Zoom from starting.
                // This allows the InputSystem to receive the mousedown event.
                const target = event.target;
                if (
                    target.closest('.node') || 
                    target.closest('.handler-g') || 
                    target.closest('.link-label-group') ||
                    target.closest('.helper-button')
                ) {
                    return false;
                }
                return !event.ctrlKey && !event.button; // Standard D3 filter behavior
            })
            .on("zoom", ({ transform }) => {
                viewport.attr("transform", transform);
                this.store.transform = transform;
            });

        svg.call(this.zoomBehavior);
        window.zoomBehavior = this.zoomBehavior; 

        this.svg = svg;
    }

    _initSystem() {
        this.store.initializeWithDefaults(); 
        this.uiController.initialize();
        
        // Pass dependencies to the renderer module
        initRenderer(this.svg, this.store, this.registry, this.eventBus);
        this.addNodeHelperSystem.listen();
        
        startRenderLoop();
        requestAnimationFrame(() => {
            this.eventBus.emit('STATE_LOADED', this.state);
        });
    }

    // ... (Remaining methods: dispatch, subscribe, _setupEventBridge, _notifySubscribers, _zoomCall, _zoomReset stay the same) ...
    dispatch(commandName, payload = {}) {
        // (Copy previous dispatch logic here)
        switch (commandName) {
            case 'create_node': return this.store.addNode(payload.type || 'task', payload.x || 0, payload.y || 0, payload.data || {});
            case 'delete_node': if (payload.id) this.store.removeNode(payload.id); break;
            case 'update_node': if (payload.id) this.store.updateNode(payload.id, payload); break;
            case 'get_node': return payload.id ? this.store.getNode(payload.id) : null;
            case 'create_link': if (payload.source && payload.target) this.store.addLink(payload.source, payload.target); break;
            case 'delete_link': if (payload.id) this.store.removeLink(payload.id); break;
            case 'update_link': if (payload.id) this.store.updateLink(payload.id, payload); break;
            case 'get_link': return payload.id ? this.store.getLink(payload.id) : null;
            case 'select':
                const obj = payload.type === 'node' ? this.store.getNode(payload.id) : this.store.getLink(payload.id);
                if (obj) this.store.selectObject(payload.type, obj);
                break;
            case 'deselect': this.store.deselect(); break;
            case 'zoom_in': this._zoomCall(1.3); break;
            case 'zoom_out': this._zoomCall(0.7); break;
            case 'zoom_reset': this._zoomReset(); break;
            case 'zoom_fit': this.uiController.fitToScreen(); break;
            case 'undo': this.store.undo(); break;
            case 'redo': this.store.redo(); break;
            case 'export':
                const data = this.serializationService.serialize(this.store.state);
                this._notifySubscribers('EXPORT_READY', data);
                return data; 
            case 'import':
                if (payload) {
                    const { nodes, links } = this.serializationService.deserialize(payload);
                    this.store.loadState({ nodes, links });
                }
                break;
            default: console.warn(`[DAGWidget] Unknown command: ${commandName}`);
        }
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    _setupEventBridge() {
        const internalEvents = ['NODE_CREATED', 'NODE_UPDATED', 'NODE_REMOVED', 'NODE_MOVED', 'CONNECTION_CREATED', 'CONNECTION_UPDATED', 'CONNECTION_REMOVED', 'SELECTION_CHANGED', 'HISTORY_CHANGED'];
        internalEvents.forEach(evtName => {
            this.eventBus.on(evtName, (payload) => this._notifySubscribers(evtName, payload));
        });
    }
    _notifySubscribers(eventType, payload) { this.subscribers.forEach(fn => fn(eventType, payload)); }
    _zoomCall(scaleFactor) { if (this.svg && this.zoomBehavior) this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, scaleFactor); }
    _zoomReset() { if (this.svg && this.zoomBehavior) this.svg.transition().duration(300).call(this.zoomBehavior.transform, d3.zoomIdentity); }
}