import { Store } from './state.js';
import { initRenderer, startRenderLoop, updateLinksOnly } from '../render/render.js';
import { Grid } from '../components/Grid.js';
import { EventBus } from './EventBus.js'; 
import { CONFIG } from './config.js';
import { UIController } from '../components/UIController.js';
import { SerializationService } from '../services/SerializationService.js';
import { TraverseService } from '../services/TraverseService.js';
import { Registry } from './Registry.js';
import { InputSystem } from '../services/InputSystem.js';
import { showCustomMenu } from '../components/ContextMenu.js';
import { getIcon } from '../components/Icons.js';
import { Note } from '../components/Note.js';
import { PluginLoader } from '../services/PluginLoader.js';
import { ConnectionDefinition } from './sdk.js';

/**
 * UTILS: Safety helpers
 */
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        console.warn('Deep clone failed, returning shallow copy', e);
        return { ...obj };
    }
};

/**
 * COMMANDS: Actions that change state.
 * Rules: Mutate state, Emit events, Return VOID.
 */
class WidgetCommands {
    constructor(widget) {
        this.widget = widget;
        this.store = widget.store;
    }

    undo() { 
        this.store.undo(); 
    }

    redo() { 
        this.store.redo(); 
    }
    
    zoomIn() { 
        this.widget._zoomCall(1.3); 
    }

    zoomOut() { 
        this.widget._zoomCall(0.7); 
    }

    zoomReset() { 
        this.widget._zoomReset(); 
    }

    zoomFit() { 
        this.widget.fitToScreen(); 
    }

    /**
     * Loads plugins from a manifest URL.
     * Asynchronous Command: Returns void immediately, state updates happen via events.
     * @param {string} [url] - Optional override for manifest URL
     */
    loadPlugins(url) {
        const manifestUrl = url || this.widget.config.manifestUrl;
        
        this.widget.pluginLoader.loadFromManifest(manifestUrl)
            .then(() => { 
                this.widget.eventBus.emit('PLUGINS_LOADED', null); 
                // Internal helper to populate initial data
                this.widget._loadDemoData();
            })
            .catch(err => console.error("Critical error during plugin loading", err));
    }

    createNode(payload) {
        this.store.addNode(
            payload.type || 'task', 
            payload.x || 0, 
            payload.y || 0, 
            payload.label || '', 
            payload.note || '', 
            payload.data || {}
        );
    }

    deleteNode(id) { 
        if(id) this.store.removeNode(id); 
    }
    
    createLink(source, target) { 
        if(source && target) this.store.addLink(source, target); 
    }
    
    deleteLink(id) { 
        if(id) this.store.removeLink(id); 
    }

    createNote(x, y) { 
        this.store.addNote(x, y); 
    }

    deleteNote(id) { 
        this.store.removeNote(id); 
    }

    importState(data) {
        if (data) {
            const { nodes, links, viewport } = this.widget.serializationService.deserialize(data);
            this.store.loadState({ nodes, links, viewport });
            
            // UI Side-effect handled here
            this.widget.svg.transition().duration(500)
                .call(window.zoomBehavior.transform, this.store.state.transform);
        }
    }

    updateNode(payload) {
        if (payload && payload.id) {
            this.store.updateNode(payload.id, payload);
        }
    }

    updateLink(payload) {
        if (payload && payload.id) {
            this.store.updateLink(payload.id, payload);
        }
    }

    selectObject(type, id) {
        const obj = type === 'node' ? this.store.getNode(id) : this.store.getLink(id);
        if (obj) this.store.selection.select(type, obj);
    }

    deselectAll() {
        this.store.selection.deselect();
    }

    async traverseDiagram({ strategy: strategyName }) {
        // CORREZIONE: Recupera la strategia dal Registry, non dal PluginLoader
        const strategyClass = this.widget.registry.getStrategy(strategyName);

        if (!strategyClass) {
            console.error(`Strategy ${strategyName} not found in Registry`);
            this.widget.eventBus.emit('TRAVERSE_ERROR', { message: `Strategy ${strategyName} not found` });
            return;
        }

        // Istanziazione (il resto era corretto)
        const strategyInstance = new strategyClass();
        
        try {
            const result = await this.widget.traverseService.run(
                this.widget.store.state, 
                strategyInstance
            );
            this.widget.eventBus.emit('TRAVERSE_COMPLETED', {
                strategy: strategyName,
                result: result
            });
        } catch (err) {
            console.error(err);
            this.widget.eventBus.emit('TRAVERSE_ERROR', { message: err.message });
        }
    }

    spawnNodeConnected({ type, x, y, sourceHandlerId }) {
        const newNode = this.store.addNode(type, x, y);
        if (newNode && sourceHandlerId) {
            const def = this.widget.registry.getNodeDefinition(type);
            if (def && def.hasTargetHandlers()) {
                const targetHandler = newNode.handlers.find(h => h.role === 'target');
                if(targetHandler) {
                    this.store.addLink(sourceHandlerId, targetHandler.id);
                }
            }
        }
    }
}

/**
 * QUERIES: Actions that return data.
 * Rules: Return Immutable Data, No Side Effects, No Events.
 */
class WidgetQueries {
    constructor(widget) {
        this.widget = widget;
    }

    getNode(id) { 
        const node = id ? this.widget.store.getNode(id) : null;
        return deepClone(node);
    }

    getLink(id) { 
        const link = id ? this.widget.store.getLink(id) : null;
        return deepClone(link);
    }
    
    getAllNodesDefinition() {
        const definitions = this.widget.registry.getAllNodeDefinitions();
        const metadata = definitions.map(DefClass => ({
            type: DefClass.type,
            role: DefClass.getRole ? DefClass.getRole() : 'Core',
        }));
        return deepClone(metadata);
    }

    getNodeIconPathData(type) {
        const Def = this.widget.registry.getNodeDefinition(type);
        return Def ? Def.getIconPath() : '';
    }

    getGraphData() {
        const data = this.widget.serializationService.serialize(this.widget.store.state);
        return deepClone(data);
    }
}

/**
 * API Facade: The strict Command-Query boundary
 */
class WidgetAPI {
    constructor(widget) {
        this.commands = new WidgetCommands(widget);
        this.queries = new WidgetQueries(widget);
    }
}

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
            manifestUrl: './src/plugins/manifest.json', 
            ...config 
        };
        
        this.subscribers = new Set();
        this.zoomBehavior = null;

        // --- 1. Instantiate Core Services ---
        this.eventBus = new EventBus();
        this.registry = new Registry(); 
        this.serializationService = new SerializationService(this.registry);
        this.store = new Store(this.eventBus, this.serializationService, this.registry);
        this.pluginLoader = new PluginLoader(this.registry);
        this.traverseService = new TraverseService(this.registry);
        
        // --- 2. Initialize API ---
        this.api = new WidgetAPI(this);

        // --- 3. Internal Command Listener ---
        this.eventBus.on('CMD_REQUESTED', ({command, payload}) => {
            this.dispatch(command, payload);
        });

        this._initDOM();
        
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

        this._initSystem();
        this._setupEventBridge();
        this.inputSystem.attachEvents();
    }

    /**
     * Legacy Dispatch Method.
     */
    dispatch(commandName, payload = {}) {
        switch (commandName) {
            // --- Commands (Mutators) ---
            case 'load_plugins': this.api.commands.loadPlugins(payload ? payload.url : undefined); break;
            case 'create_node': this.api.commands.createNode(payload); break;
            case 'delete_node': this.api.commands.deleteNode(payload.id); break;
            case 'create_link': this.api.commands.createLink(payload.source, payload.target); break;
            case 'delete_link': this.api.commands.deleteLink(payload.id); break;
            case 'create_note': this.api.commands.createNote(payload.x, payload.y); break;
            case 'delete_note': this.api.commands.deleteNote(payload.noteId); break;
            case 'spawn_node_connected': this.api.commands.spawnNodeConnected(payload); break;
            case 'undo': this.api.commands.undo(); break;
            case 'redo': this.api.commands.redo(); break;
            case 'zoom_in': this.api.commands.zoomIn(); break;
            case 'zoom_out': this.api.commands.zoomOut(); break;
            case 'zoom_reset': this.api.commands.zoomReset(); break;
            case 'zoom_fit': this.api.commands.zoomFit(); break;
            case 'import': this.api.commands.importState(payload); break;
            case 'update_node': this.api.commands.updateNode(payload); break;
            case 'update_link': this.api.commands.updateLink(payload); break;
            case 'deselect': this.api.commands.deselectAll(); break;
            case 'select': this.api.commands.selectObject(payload.type, payload.id); break;
            case 'traverse': this.api.commands.traverseDiagram(payload); break;
            
            // --- Queries (Data Fetchers) ---
            case 'get_node': return this.api.queries.getNode(payload.id);
            case 'get_link': return this.api.queries.getLink(payload.id);
            case 'get_nodes_definition': return this.api.queries.getAllNodesDefinition();
            case 'get_node_icon_path_data': return this.api.queries.getNodeIconPathData(payload.type);
            
            // --- Legacy Handlers ---
            case 'export':
                const data = this.api.queries.getGraphData();
                this._notifySubscribers('EXPORT_READY', data);
                return data;

            case 'get_object_detail':
                return payload.type === 'link' 
                    ? this.api.queries.getLink(payload.id)
                    : this.api.queries.getNode(payload.id);

            case 'open_connection_menu':
                this._showNodeCreationMenu(payload.clientX, payload.clientY, payload.sourceHandlerId);
                break;

            default: 
                console.warn(`[DAGWidget] Unknown command: ${commandName}`);
        }
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    // --- Internal Implementation Details ---

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
        
        this.layers = {};
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
                if (target.closest('.node') || target.closest('.handler-g') || target.closest('.link-label-group') || target.closest('.helper-button')) {
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

        const initialTransform = d3.zoomIdentity
            .translate(this.config.initialOffsetX, this.config.initialOffsetY)
            .scale(this.config.initialZoom);
            
        this.store.transform = initialTransform;
        svg.call(this.zoomBehavior.transform, initialTransform);

        this.svg = svg;
    }

    _initSystem() {
        if (this.config.showDefaultUI) {
            this.uiController.initialize();
        }
        
        initRenderer(this.svg, this.store, this.registry, this.eventBus);
        this.registry.registerConnection('default', ConnectionDefinition);
        
        startRenderLoop();

        this.eventBus.on('NODE_MOVED_HIGH_FREQ', (node) => updateLinksOnly(node.id));
        this.eventBus.on('NODE_MOVED', (data) => updateLinksOnly(data.id));
        this.eventBus.on('CONNECTION_MOVED_HIGH_FREQ', () => updateLinksOnly());
        this.eventBus.on('CONNECTION_UPDATED', () => updateLinksOnly());
        this.eventBus.on('GHOST_CONNECTION_UPDATED', () => updateLinksOnly());
        
        requestAnimationFrame(() => this.eventBus.emit('STATE_LOADED', this.state));
        
        this.eventBus.on('NOTE_CREATED', (noteData) => new Note(noteData.id, noteData, this));
        this.eventBus.on('NOTE_REMOVED', (noteId) => {
             const el = document.getElementById(noteId);
             if(el) el.closest('foreignObject').remove(); 
        });
        this.eventBus.on('CONNECTION_REMOVED', () => updateLinksOnly());
    }

    // INTERNAL: Called by Command 'loadPlugins'
    _loadDemoData() {
        const n1 = this.store.addNode('start', 96, 224);
        const n2 = this.store.addNode('task', 480, 416);
        const n3 = this.store.addNode('service', 736, 608);
        const n4 = this.store.addNode('end', 1056, 416);
        if (n1 && n2) this.store.addLink(n1.handlers[0].id, n2.handlers[0].id);
        if (n2 && n3) this.store.addLink(n2.handlers[1].id, n3.handlers[0].id);
        if (n2 && n4) this.store.addLink(n2.handlers[1].id, n4.handlers[0].id);
        this.store.history.reset(); 
    }

    getWidgetCoordinates(clientX, clientY) {
        const transform = d3.zoomTransform(this.svg.node());
        return {
            x: (clientX - transform.x) / transform.k,
            y: (clientY - transform.y) / transform.k
        };
    }

    fitToScreen() {
        if (this.store.nodes.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.store.nodes.forEach(n => {
            minX = Math.min(minX, n.position.x); 
            minY = Math.min(minY, n.position.y);
            maxX = Math.max(maxX, n.position.x + (n.width || 100));
            maxY = Math.max(maxY, n.position.y + (n.height || 50));
        });
        const bounds = { minX, minY, maxX, maxY };
        
        const width = this.container.clientWidth; 
        const height = this.container.clientHeight;
        const dx = bounds.maxX - bounds.minX;
        const dy = bounds.maxY - bounds.minY;
        const x = (bounds.minX + bounds.maxX) / 2;
        const y = (bounds.minY + bounds.maxY) / 2;
        
        const scale = Math.max(0.1, Math.min(4, 0.9 / Math.max(dx / width, dy / height)));
        const translate = [width / 2 - scale * x, height / 2 - scale * y];
        this.svg.transition().duration(750)
           .call(this.zoomBehavior.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }

    _showNodeCreationMenu(clientX, clientY, sourceHandlerId = null) {
        const nodeTypes = this.registry.getNodeTypes().filter(t => t !== 'base');
        const menuItems = nodeTypes.map(type => {
            return {
                label: type.charAt(0).toUpperCase() + type.slice(1),
                icon: getIcon('addNode', 16), 
                callback: () => {
                    const transform = this.store.transform;
                    const graphX = (clientX - transform.x) / transform.k;
                    const graphY = (clientY - transform.y) / transform.k;

                    if (sourceHandlerId) {
                        this.api.commands.spawnNodeConnected({ 
                            type, x: graphX + 50, y: graphY - 20, sourceHandlerId 
                        });
                    } else {
                        this.api.commands.createNode({ type, x: graphX, y: graphY });
                    }
                }
            };
        });
        showCustomMenu(clientX, clientY, menuItems);
    }

    _setupEventBridge() {
        const internalEvents = ['PLUGINS_LOADED', 'TRAVERSE_TRIGGERED', 'TRAVERSE_COMPLETED', 'TRAVERSE_ERROR', 'NODE_CREATED', 'NODE_UPDATED', 'NODE_REMOVED', 'NODE_MOVED', 'CONNECTION_CREATED', 'CONNECTION_UPDATED', 'CONNECTION_REMOVED', 'SELECTION_CHANGED', 'HISTORY_CHANGED'];
        internalEvents.forEach(evtName => {
            this.eventBus.on(evtName, (payload) => this._notifySubscribers(evtName, payload));
        });
    }
    
    _notifySubscribers(eventType, payload) { this.subscribers.forEach(fn => fn(eventType, payload)); }
    _zoomCall(scaleFactor) { if (this.svg && this.zoomBehavior) this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, scaleFactor); }
    _zoomReset() { if (this.svg && this.zoomBehavior) this.svg.transition().duration(300).call(this.zoomBehavior.transform, d3.zoomIdentity); }
}