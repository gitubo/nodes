import { Store } from './state.js';
import { initRenderer, startRenderLoop } from '../render/render.js';
import { Grid } from '../components/Grid.js';
import { EventBus } from './EventBus.js'; 
import { CONFIG } from './config.js';
import { UIController } from '../components/UIController.js';
import { SerializationService } from '../services/SerializationService.js';
import { Registry, registerDefaultDefinitions } from './Registry.js'; 
import { InputSystem } from '../services/InputSystem.js';
import { showCustomMenu } from '../components/ContextMenu.js';
import { getStrokeIcon } from '../components/Icons.js';
import { Note } from '../components/Note.js';

export class DAGWidget {
    constructor(containerSelector, config = {}) {
        this.container = typeof containerSelector === 'string' 
            ? document.querySelector(containerSelector) 
            : containerSelector;
        if (!this.container) throw new Error(`Container ${containerSelector} not found`);

        this.config = { 
            width: '100%', 
            height: '100%', 
            showDefaultUI: true, 
            initialZoom: 1.0, 
            initialOffsetX: 0, 
            initialOffsetY: 0,
            ...config };
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
        if (this.config.showDefaultUI) {
            this.uiController = new UIController(
                this,
                this.store, 
                this.eventBus, 
                this.serializationService, 
                this.registry,
            );
        }

        // Listen for internal command requests from InputSystem
        this.eventBus.on('CMD_REQUESTED', ({command, payload}) => {
            this.dispatch(command, payload);
        });

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
        
        // Define Layers Object
        this.layers = {};
        
        // The order of appending here defines the Z-index (last one is on top)
        this.layers.grid = viewport.append("g").attr("class", "grid-layer").node();
        this.layers.notes = viewport.append("g").attr("class", "note-layer").node();
        this.layers.links = viewport.append("g").attr("class", "link-layer").node();
        this.layers.labels = viewport.append("g").attr("class", "label-layer").node(); 
        this.layers.nodes = viewport.append("g").attr("class", "node-layer").node(); 

        Grid.render(viewport.select(".grid-layer"), 50000);

        this.zoomBehavior = d3.zoom()
            .scaleExtent([CONFIG.zoom.min, CONFIG.zoom.max])
            .filter((event) => {
                const target = event.target;
                if (
                    target.closest('.node') || 
                    target.closest('.handler-g') || 
                    target.closest('.link-label-group') ||
                    target.closest('.helper-button')
                ) {
                    return false;
                }
                return !event.ctrlKey && !event.button;
            })
            .on("zoom", ({ transform }) => {
                viewport.attr("transform", transform);
                this.store.transform = transform;
            });

        svg.call(this.zoomBehavior);
        window.zoomBehavior = this.zoomBehavior; 

        const initialScale = this.config.initialZoom; 
        const initialOffsetX = this.config.initialOffsetX;
        const initialOffsetY = this.config.initialOffsetY;
        const initialTransform = d3.zoomIdentity
            .translate(initialOffsetX, initialOffsetY)
            .scale(initialScale);
        this.store.transform = initialTransform;
        svg.call(this.zoomBehavior.transform, initialTransform);

        this.svg = svg;
    }

    _initSystem() {
        this.store.initializeWithDefaults(); 
        if (this.config.showDefaultUI) {
            this.uiController.initialize();
        }
        
        // Pass dependencies to the renderer module
        initRenderer(this.svg, this.store, this.registry, this.eventBus);
        //this.addNodeHelperSystem.listen();
        
        startRenderLoop();
        requestAnimationFrame(() => {
            this.eventBus.emit('STATE_LOADED', this.state);
        });

        this.eventBus.on('NOTE_CREATED', (noteData) => {
            new Note(noteData.id, noteData, this);
        });
        
        this.eventBus.on('NOTE_REMOVED', (noteId) => {
             const el = document.getElementById(noteId);
             if(el) el.closest('foreignObject').remove(); // Remove the wrapper
        });
    }

    /**
     * Converts screen/container coordinates (pixels) to internal graph coordinates.
     * Useful for dropping nodes at specific screen locations (like the center).
     * @param {number} clientX - X position relative to the container's top-left
     * @param {number} clientY - Y position relative to the container's top-left
     */
    getWidgetCoordinates(clientX, clientY) {
        // 1. Get the current D3 Zoom Transform state
        const transform = d3.zoomTransform(this.svg.node());
        
        // 2. Apply the inverse transform formula: (Screen - Translate) / Scale
        return {
            x: (clientX - transform.x) / transform.k,
            y: (clientY - transform.y) / transform.k
        };
    }

    fitToScreen() {
        // Calculate Bounds
        if (this.store.nodes.length === 0) return;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.store.nodes.forEach(n => {
            minX = Math.min(minX, n.position.x); 
            minY = Math.min(minY, n.position.y);
            maxX = Math.max(maxX, n.position.x + (n.width || 100));
            maxY = Math.max(maxY, n.position.y + (n.height || 50));
        });

        const bounds = { minX, minY, maxX, maxY };
        
        // Apply Zoom
        const svg = this.svg;
        const width = this.container.clientWidth; // Use container dimensions
        const height = this.container.clientHeight;
        const dx = bounds.maxX - bounds.minX;
        const dy = bounds.maxY - bounds.minY;
        const x = (bounds.minX + bounds.maxX) / 2;
        const y = (bounds.minY + bounds.maxY) / 2;
        
        const scale = Math.max(0.1, Math.min(4, 0.9 / Math.max(dx / width, dy / height)));
        const translate = [width / 2 - scale * x, height / 2 - scale * y];
        
        svg.transition().duration(750)
           .call(this.zoomBehavior.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }

    dispatch(commandName, payload = {}) {
        // (Copy previous dispatch logic here)
        switch (commandName) {
            case 'create_node': 
                return this.store.addNode(
                    payload.type || 'task', 
                    payload.x || 0, 
                    payload.y || 0, 
                    payload.label || '', 
                    payload.note || '', 
                    payload.data || {}
                );
            case 'delete_node': if (payload.id) this.store.removeNode(payload.id); break;
            case 'update_node': if (payload.id) this.store.updateNode(payload.id, payload); break;
            case 'get_node': return payload.id ? this.store.getNode(payload.id) : null;
            case 'get_nodes_definition': 
                const nodeTypes = this.registry.getNodeTypes();
                return nodeTypes
                    .filter(type => type !== 'base') 
                    .map(type => {
                        const Def = this.registry.getNodeDefinition(type);
                        if (!Def) return null;
                        const role = Def.getRole ? Def.getRole() : NODE_ROLES.CORE; 
                        const label = Def.name.replace('Definition', ''); 
                        return { type, role, label };
                    })
                    .filter(def => def !== null); 
            case 'get_object_detail':
                return payload.id ? this.store.getObjectById(payload.id) : null;
            case 'get_node_icon_path_data':
                const Def = this.registry.getNodeDefinition(payload.type);
                return Def ? Def.getIconPath() : '';
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
            case 'zoom_fit': this.fitToScreen(); break;
            case 'undo': this.store.undo(); break;
            case 'redo': this.store.redo(); break;
            case 'export':
                const data = this.serializationService.serialize(this.store.state);
                this._notifySubscribers('EXPORT_READY', data);
                return data; 
            case 'import':
                if (payload) {
                    const { nodes, links, viewport } = this.serializationService.deserialize(payload);
                    this.store.loadState({ nodes, links, viewport });
                    this.svg.transition().duration(500)
                        .call(window.zoomBehavior.transform, this.state.transform);
                }
                break;
            case 'open_connection_menu':
                // Delegate UI logic to controller to keep Widget clean
                this._showNodeCreationMenu(
                    payload.clientX, 
                    payload.clientY, 
                    payload.sourceHandlerId
                );
                break;
            case 'spawn_node_connected':
                const { type, x, y, sourceHandlerId } = payload;
                const newNode = this.store.addNode(type, x, y);
                if (newNode && sourceHandlerId) {
                    // Auto-connect to the first target handler of the new node
                    const def = this.registry.getNodeDefinition(type);
                    if (def && def.hasTargetHandlers()) {
                         // Find the ID of the first handler in the new node instance
                         const targetHandler = newNode.handlers.find(h => h.role === 'target');
                         if(targetHandler) {
                             this.store.addLink(sourceHandlerId, targetHandler.id);
                         }
                    }
                }
                break;
            case 'create_note':
                return this.store.addNote(payload.x, payload.y);
            case 'delete_note':
                this.store.removeNote(payload.noteId);
                break;
            default: console.warn(`[DAGWidget] Unknown command: ${commandName}`);
        }
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    _showNodeCreationMenu(clientX, clientY, sourceHandlerId = null) {
        const nodeTypes = this.registry.getNodeTypes().filter(t => t !== 'base');
        
        const menuItems = nodeTypes.map(type => {
            return {
                label: type.charAt(0).toUpperCase() + type.slice(1),
                icon: getStrokeIcon('addNode', 16), 
                callback: () => {
                    const transform = this.store.transform;
                    const graphX = (clientX - transform.x) / transform.k;
                    const graphY = (clientY - transform.y) / transform.k;

                    if (sourceHandlerId) {
                        this.dispatch('spawn_node_connected', { 
                            type, 
                            x: graphX + 50, // Slight offset for visual flow
                            y: graphY - 20, 
                            sourceHandlerId 
                        });
                    } else {
                        this.store.addNode(type, graphX, graphY);
                    }
                }
            };
        });

        showCustomMenu(clientX, clientY, menuItems);
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