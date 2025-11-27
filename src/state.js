// src/state.js
import { registry } from './Registry.js';
import { snapToGrid } from './config.js';
import { eventBus } from './EventBus.js';
import { HistoryManager } from './HistoryManager.js';

const generateId = () => crypto.randomUUID();

class Store {
    constructor() {
        this.state = {
            nodes: [],
            links: [],
            transform: d3.zoomIdentity,
            ui: {
                ghostLink: null,
                disconnectingLink: null, 
                selectedObject: null 
            },
            cache: {
                nodeLinks: new Map() 
            }
        };
        
        this.history = new HistoryManager(30);
        this._saveHistory(); 
    }

    get nodes() { return this.state.nodes; }
    get links() { return this.state.links; }
    get ui() { return this.state.ui; }
    get transform() { return this.state.transform; }
    set transform(val) { this.state.transform = val; }

    getNode(id) { return this.state.nodes.find(n => n.id === id); }
    getLink(id) { return this.state.links.find(l => l.id === id); } 

    getLinksForNode(nodeId) {
        return Array.from(this.state.cache.nodeLinks.get(nodeId) || []);
    }

    _rebuildCache() {
        this.state.cache.nodeLinks.clear();
        this.state.links.forEach(link => {
            const { source, target } = link;
            if (!this.state.cache.nodeLinks.has(source)) {
                this.state.cache.nodeLinks.set(source, new Set());
            }
            if (!this.state.cache.nodeLinks.has(target)) {
                this.state.cache.nodeLinks.set(target, new Set());
            }
            this.state.cache.nodeLinks.get(source).add(link);
            this.state.cache.nodeLinks.get(target).add(link);
        });
    }

    _saveHistory() {
        this.history.save(this.serialize()); 
    }
    
    // --- MUTATORS ---

    addNode(type, x, y, label='', note='', data = {}) {
        this._saveHistory();
        const definition = registry.getNodeDefinition(type);
        if (!definition) {
            console.error(`Node type ${type} not registered.`);
            return null;
        }

        const node = new definition(snapToGrid(x), snapToGrid(y), label, note, data);
        this.state.nodes.push(node);
        eventBus.emit('NODE_CREATED', node);
        return node;
    }

    removeNode(nodeId) {
        this._saveHistory(); 
        this.state.links = this.state.links.filter(link => 
            link.source !== nodeId && link.target !== nodeId
        );
        this.state.nodes = this.state.nodes.filter(n => n.id !== nodeId);

        this._rebuildCache();
        eventBus.emit('NODE_REMOVED', nodeId);
        eventBus.emit('STATE_UPDATED'); 
    }

    addLink(sourceHandlerId, targetHandlerId) {
        // AGGIUNTO CONTROLLO DI VALIDITÀ DEI PARAMETRI
        if (!sourceHandlerId || !targetHandlerId) {
             console.error("Cannot add link: Missing source or target IDs.", 
                           {sourceHandlerId, targetHandlerId});
             return null;
        }

        this._saveHistory(); 
        const id = generateId();
        const link = {
            id,
            sourceHandlerId,
            targetHandlerId,
            label: ''
        };
        
        this.state.links.push(link);
        this._rebuildCache();
        eventBus.emit('LINK_CREATED', link);
        return link;
    }
    
    removeLink(linkId) {
        this._saveHistory(); 
        this.state.links = this.state.links.filter(l => l.id !== linkId);
        this._rebuildCache();
        eventBus.emit('LINK_REMOVED', linkId);
        eventBus.emit('STATE_UPDATED');
    }

    moveNode(nodeId, newX, newY) {
        const node = this.getNode(nodeId);
        if (node) {
            node.position.x = snapToGrid(newX);
            node.position.y = snapToGrid(newY);

            eventBus.emit('NODE_MOVED', node);
        }
    }
    
    // --- UI/TOOLS ---
    // ... (select, deselect, setGhostLink omessi per brevità, sono già corretti)
    select(object) {
        this.state.ui.selectedObject = object;
        eventBus.emit('OBJECT_SELECTED', object);
    }
    
    deselect() {
        this.state.ui.selectedObject = null;
        eventBus.emit('OBJECT_DESELECTED');
    }

    setGhostLink(ghostData) {
        this.state.ui.ghostLink = ghostData;
    }

    setDisconnectingLink(linkId) {
        this.state.ui.disconnectingLink = linkId;
    }

    // --- HISTORY ---
    // ... (undo, redo omessi per brevità, sono già corretti)
    undo() {
        if (!this.history.canUndo()) return;
        const previousStateData = this.history.undo(); 
        if (previousStateData) {
            this.deserialize(previousStateData); 
            eventBus.emit('STATE_UPDATED'); 
        } else {
             console.warn("Undo: Fallito o saltato un elemento della cronologia corrotto.");
        }
    }
    
    redo() {
        if (!this.history.canRedo()) return;
        const nextStateData = this.history.redo();
        if (nextStateData) {
            this.deserialize(nextStateData);
            eventBus.emit('STATE_UPDATED'); 
        } else {
             console.warn("Redo: Fallito o saltato un elemento della cronologia corrotto.");
        }
    }


    // --- SERIALIZATION/DESERIALIZATION ---

    serialize() {
        const exportData = {
            nodes: {},
            connections: {}
        };
        
        this.state.nodes.forEach(node => {
            if (typeof node.serialize === 'function') {
                exportData.nodes[node.id] = node.serialize(); 
            } else {
                 console.warn(`Node ${node.id} (${node.type}) missing serialize function.`);
            }
        });
        this.state.links.forEach(link => {
            exportData.connections[link.id] = { ...link };
        });
        return exportData;
    }

    deserialize(data) {
        if (!data || !data.nodes || !data.connections) return;
        
        const newNodes = Object.values(data.nodes).map(nodeData => {
            const definition = registry.getNodeDefinition(nodeData.type);
            return definition ? definition.deserialize(nodeData) : nodeData; 
        });
        
        const newLinks = Object.values(data.connections).map(l => ({
            id: l.id, source: l.source, sourceHandler: l.sourceHandler, target: l.target, targetHandler: l.targetHandler, label: l.label
        }));

        this.state = {
            ...this.state,
            nodes: newNodes,
            links: newLinks
        };
        
        this._rebuildCache();
        eventBus.emit('STATE_LOADED', this.state); 
        this.deselect();
    }
    
    initializeWithDefaults() {
        const n1 = this.addNode('start', 128, 0);
        const n2 = this.addNode('task', 416, 0);
        const n3 = this.addNode('switch', 736, 0, 'Switch', 'device.type');
        const n4 = this.addNode('service', 1152, 352, 'HTTP', '[POST]');
        const n5 = this.addNode('service', 1344, 352, 'HTTP', '[GET]');
        const n6 = this.addNode('end', 1504, 0);

        
    }
}

export const store = new Store();
export const state = store.state;