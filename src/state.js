// src/state.js - Refactored into a proper Store
import { registry } from './Registry.js';
import { snapToGrid } from './config.js';
import { eventBus } from './EventBus.js';

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

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

    /**
     * Core Action: Add Node
     */
    addNode(type, x, y, initialData = {}) {
        const definition = registry.getNodeDefinition(type);
        if (!definition) {
            console.error(`Unknown node type: ${type}`);
            return null;
        }

        const nodeId = generateId();
        const handlers = definition.getHandlers().map(h => ({
            id: `${nodeId}_${h.type}_${generateId()}`,
            type: h.type,
            label: h.label || h.type,
            offset_x: h.offset_x || 0,
            offset_y: h.offset_y || 0,
            hideLabel: h.hideLabel
        }));

        const baseData = {
            id: nodeId,
            type: type,
            x: snapToGrid(x),
            y: snapToGrid(y),
            label: type.charAt(0).toUpperCase() + type.slice(1),
            handlers: handlers
        };

        const node = { ...baseData, ...definition.getData(), ...initialData };
        this.state.nodes.push(node);
        
        eventBus.emit('STATE_UPDATED', this.state);
        return node;
    }

    /**
     * Core Action: Update Node
     */
    updateNode(nodeId) {
        const node = this.state.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const handlerIds = node.handlers.map(h => h.id);
        
        //TODO update the passed node

        eventBus.emit('STATE_UPDATED', this.state);
    }

    /**
     * Core Action: Remove Node
     */
    removeNode(nodeId) {
        const node = this.state.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const handlerIds = node.handlers.map(h => h.id);
        
        // Remove connections
        this.state.links = this.state.links.filter(l => 
            !handlerIds.includes(l.source) && !handlerIds.includes(l.target)
        );

        // Remove node
        this.state.nodes = this.state.nodes.filter(n => n.id !== nodeId);

        // Deselect if needed
        if (this.state.ui.selectedObject?.data?.id === nodeId) {
            this.deselect();
        }

        eventBus.emit('STATE_UPDATED', this.state);
    }

    /**
     * Core Action: Add Link
     */
    addLink(sourceId, targetId) {
        const link = {
            id: `link_${Date.now()}`,
            source: sourceId,
            target: targetId
        };
        this.state.links.push(link);
        eventBus.emit('STATE_UPDATED', this.state);
    }

    /**
     * Core Action: Remove Link
     */
    removeLink(linkId) {
        this.state.links = this.state.links.filter(l => l.id !== linkId);
        if (this.state.ui.selectedObject?.data?.id === linkId) {
            this.deselect();
        }
        eventBus.emit('STATE_UPDATED', this.state);
    }

    /**
     * Selection Logic
     */
    selectObject(type, data) {
        this.state.ui.selectedObject = { type, data };
        eventBus.emit('SELECTION_CHANGED', this.state.ui.selectedObject);
        eventBus.emit('RENDER_REQUESTED'); 
    }

    deselect() {
        this.state.ui.selectedObject = null;
        eventBus.emit('SELECTION_CHANGED', null);
        eventBus.emit('RENDER_REQUESTED');
    }

    /**
     * Ghost Link Logic (for Dragging)
     */
    setGhostLink(ghostData) {
        this.state.ui.ghostLink = ghostData;
        eventBus.emit('RENDER_REQUESTED'); // Only trigger render, no state save
    }

    setDisconnectingLink(link) {
        this.state.ui.disconnectingLink = link;
    }
    
    // --- Serialization (Legacy Support) ---
    serialize() {
        const exportData = {
            metadata: { version: "2.1.0", created_at: new Date().toISOString() },
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

        eventBus.emit('STATE_UPDATED', this.state);
    }
    
    initializeWithDefaults() {
        const n1 = this.addNode('start', 100, 150);
        const n2 = this.addNode('task', 350, 200);
        const n3 = this.addNode('end', 600, 150);
        
        if (n1 && n2) this.addLink(n1.handlers[0].id, n2.handlers[0].id);
    }
}

export const store = new Store();
// Backward compatibility for older modules importing 'state' directly
export const state = store.state; 
// Export helpers for modules that haven't been fully refactored to use store methods
export const createNode = (type, x, y) => store.addNode(type, x, y);
export const removeNode = (id) => store.removeNode(id);