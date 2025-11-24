// src/state.js
import { registry } from './Registry.js';
import { snapToGrid } from './config.js';
import { eventBus } from './EventBus.js';

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
            }
        };
    }

    get nodes() { return this.state.nodes; }
    get links() { return this.state.links; }
    get ui() { return this.state.ui; }
    get transform() { return this.state.transform; }
    set transform(val) { this.state.transform = val; }

    getNode(id) { return this.state.nodes.find(n => n.id === id); }
    getLink(id) { return this.state.links.find(l => l.id === id); }

    addNode(type, x, y, initialData = {}) {
        const definition = registry.getNodeDefinition(type);
        if (!definition) return null;

        const nodeId = generateId();
        const handlers = definition.getHandlers().map(h => ({
            id: generateId(),
            type: h.type,
            label: h.label,
            offset_x: h.offset_x || 0,
            offset_y: h.offset_y || 0,
            ...h 
        }));

        const baseData = {
            id: nodeId,
            type: type,
            x: snapToGrid(x),
            y: snapToGrid(y),
            label: type.charAt(0).toUpperCase() + type.slice(1),
            handlers: handlers,
            note: '', 
            custom_params: {} 
        };

        const node = { ...baseData, ...definition.getData(), ...initialData };
        this.state.nodes.push(node);
        
        // Granular Event
        eventBus.emit('NODE_CREATED', { id: nodeId });
        return node; 
    }

    updateNode(nodeId, newProps) {
        const nodeIndex = this.state.nodes.findIndex(n => n.id === nodeId);
        if (nodeIndex === -1) return;

        this.state.nodes[nodeIndex] = {
            ...this.state.nodes[nodeIndex],
            ...newProps,
        };
        // Granular Event
        eventBus.emit('NODE_UPDATED', { id: nodeId });
    }

    removeNode(nodeId) {
        const node = this.state.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const handlerIds = node.handlers.map(h => h.id);
        
        // Remove connections
        const linksToRemove = this.state.links.filter(l => 
            handlerIds.includes(l.source) || handlerIds.includes(l.target)
        );
        
        this.state.links = this.state.links.filter(l => !linksToRemove.includes(l));
        this.state.nodes = this.state.nodes.filter(n => n.id !== nodeId);

        if (this.state.ui.selectedObject?.id === nodeId) {
            this.deselect();
        }

        // Granular Events
        if (linksToRemove.length > 0) {
            linksToRemove.forEach(l => eventBus.emit('CONNECTION_REMOVED', { id: l.id }));
        }
        eventBus.emit('NODE_REMOVED', { id: nodeId });
    }

    addLink(sourceId, targetId) {
        const link = {
            id: generateId(),
            source: sourceId,
            target: targetId
        };
        this.state.links.push(link);
        const sourceNode = this.state.nodes.find(n => n.handlers.some(h => h.id === sourceId));
        const targetNode = this.state.nodes.find(n => n.handlers.some(h => h.id === targetId));

        const eventPayload = {
            id: link.id,
            source: {
                node_id: sourceNode ? sourceNode.id : null,
                handler_id: sourceId
            },
            target: {
                node_id: targetNode ? targetNode.id : null,
                handler_id: targetId
            }
        };
        eventBus.emit('CONNECTION_CREATED', eventPayload);
    }

    removeLink(linkId) {
        this.state.links = this.state.links.filter(l => l.id !== linkId);
        if (this.state.ui.selectedObject?.id === linkId) {
            this.deselect();
        }
        eventBus.emit('CONNECTION_REMOVED', { id: linkId });
    }

    updateLink(linkId, newProps) {
        const idx = this.state.links.findIndex(l => l.id === linkId);
        if (idx === -1) return;
        this.state.links[idx] = { ...this.state.links[idx], ...newProps };
        eventBus.emit('CONNECTION_UPDATED', { id: linkId });
    }

    selectObject(type, objectData) {
        this.state.ui.selectedObject = { type, id: objectData.id };
        eventBus.emit('SELECTION_CHANGED', { type, id: objectData.id });
    }

    deselect() {
        if (this.state.ui.selectedObject !== null) {
            this.state.ui.selectedObject = null;
            eventBus.emit('DESELECTION'); 
        }
    }

    setGhostLink(ghostData) {
        this.state.ui.ghostLink = ghostData;
        eventBus.emit('GHOST_LINK_UPDATED', ghostData); 
    }

    setDisconnectingLink(link) {
        this.state.ui.disconnectingLink = link;
    }
    
    serialize() {
        const exportData = {
            metadata: { version: "0.1.0", created_at: new Date().toISOString() },
            nodes: {},
            connections: {}
        };
        this.state.nodes.forEach(node => {
            const definition = registry.getNodeDefinition(node.type);
            exportData.nodes[node.id] = definition ? definition.serialize(node) : node;
        });
        this.state.links.forEach(link => {
            exportData.connections[link.id] = { ...link };
        });
        return exportData;
    }

    deserialize(data) {
        if (!data || !data.nodes || !data.connections) return;
        this.state.nodes = Object.values(data.nodes).map(nodeData => {
            const definition = registry.getNodeDefinition(nodeData.type);
            return definition ? definition.deserialize(nodeData) : nodeData;
        });
        this.state.links = Object.values(data.connections).map(l => ({
            id: l.id, source: l.source, target: l.target, label: l.label
        }));
        
        // Full refresh
        eventBus.emit('NODE_CREATED', {}); 
    }
    
    initializeWithDefaults() {
        const n1 = this.addNode('start', 100, 150);
        const n2 = this.addNode('task', 350, 200);
        const n3 = this.addNode('end', 600, 150);
        
        if (n1 && n2 && n1.handlers[0] && n2.handlers[0]) {
            const target = n2.handlers.find(h => h.type === 'target');
            if (target) this.addLink(n1.handlers[0].id, target.id);
        }
    }
}

export const store = new Store();
export const state = store.state;