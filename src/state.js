// state.js
import { registry } from './Registry.js';
import { snapToGrid } from './config.js';

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

export const state = {
    nodes: [],
    links: [],
    transform: d3.zoomIdentity,
    ui: {
        ghostLink: null,
        disconnectingLink: null
    }
};

/**
 * Create a new node instance from a node definition
 * @param {string} type - Node type
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object} Node instance
 */
export function createNode(type, x, y) {
    const definition = registry.getNodeDefinition(type);
    if (!definition) {
        console.error(`Unknown node type: ${type}`);
        return null;
    }
    
    const nodeId = generateId();
    const handlers = definition.getInitialHandlers().map(h => ({
        id: `${nodeId}_${h.type}_${generateId()}`,
        type: h.type,
        label: h.label || h.type,
        offset_x: h.offset_x || 0,
        offset_y: h.offset_y || 0 
    }));
    
    const baseData = {
        id: nodeId,
        type: type,
        x: snapToGrid(x),
        y: snapToGrid(y),
        label: type.charAt(0).toUpperCase() + type.slice(1),
        handlers: handlers
    };
    
    const initialData = definition.getInitialData();
    return { ...baseData, ...initialData };
}

/**
 * Add a node to the state
 * @param {string} type - Node type
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object} Created node
 */
export function addNode(type, x, y) {
    const node = createNode(type, x, y);
    if (node) {
        state.nodes.push(node);
    }
    return node;
}

/**
 * Remove a node and its associated links
 * @param {string} nodeId - Node ID to remove
 */
export function removeNode(nodeId) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Remove all links connected to this node's handlers
    const handlerIds = node.handlers.map(h => h.id);
    state.links = state.links.filter(l => 
        !handlerIds.includes(l.source) && !handlerIds.includes(l.target)
    );
    
    // Remove the node
    state.nodes = state.nodes.filter(n => n.id !== nodeId);
}

/**
 * Serialize the entire graph state
 * @returns {Object} Serialized state
 */
export function serializeState() {
    return {
        version: '1.0',
        nodes: state.nodes.map(node => {
            const definition = registry.getNodeDefinition(node.type);
            return definition ? definition.serialize(node) : node;
        }),
        links: state.links.map(link => ({
            id: link.id,
            source: link.source,
            target: link.target
        }))
    };
}

/**
 * Deserialize and load a graph state
 * @param {Object} data - Serialized state data
 */
export function deserializeState(data) {
    if (!data || !data.nodes) {
        console.error('Invalid state data');
        return;
    }
    
    // Clear current state
    state.nodes = [];
    state.links = [];
    state.ui.ghostLink = null;
    state.ui.disconnectingLink = null;
    
    // Deserialize nodes
    state.nodes = data.nodes.map(nodeData => {
        const definition = registry.getNodeDefinition(nodeData.type);
        return definition ? definition.deserialize(nodeData) : nodeData;
    });
    
    // Deserialize links
    state.links = (data.links || []).map(link => ({
        id: link.id || generateId(),
        source: link.source,
        target: link.target
    }));
}

/**
 * Initialize state with example nodes
 */
export function initializeState() {
    const n1 = createNode('start', 100, 150);
    const n2 = createNode('task', 350, 200);
    const n3 = createNode('end', 600, 150);
    
    state.nodes.push(n1, n2, n3);
    
    state.links.push({
        id: generateId(),
        source: n1.handlers[0].id,
        target: n2.handlers[0].id
    });
}