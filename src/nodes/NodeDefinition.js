// NodeDefinition.js - Base interface for all node types
import { CONFIG } from '../config.js';


/**
 * Base NodeDefinition class that all node types should extend
 */
export class NodeDefinition {
    constructor() {
        this.type = 'base';
    }
    
    /**
     * Returns the initial handlers configuration for this node type
     * @returns {Array} Array of handler definitions
     */
    getInitialHandlers() {
        return [];
    }
    
    /**
     * Returns the initial data for a new node instance
     * @returns {Object} Initial node data
     */
    getInitialData() {
        return {};
    }
    
    /**
     * Returns the SVG path definition for this node's shape
     * @returns {string} SVG path 'd' attribute
     */
    getShapePath() {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const R = CONFIG.node.smallBorderRadius;
        return `M ${R},0 L ${W-R},0 A ${R},${R} 0 0 1 ${W},${R} L ${W},${H-R} A ${R},${R} 0 0 1 ${W-R},${H} L ${R},${H} A ${R},${R} 0 0 1 0,${H-R} L 0,${R} A ${R},${R} 0 0 1 ${R},0 Z`;
    }
    
    /**
     * Returns the CSS class(es) for the node body
     * @returns {string} CSS classes
     */
    getBodyClass() {
        return `node-body ${this.type}`;
    }
    
    /**
     * Serialize node instance data to JSON
     * @param {Object} node - The node instance
     * @returns {Object} Serialized data
     */
    serialize(node) {
        return {
            id: node.id,
            type: node.type,
            x: node.x,
            y: node.y,
            name: node.name,
            handlers: node.handlers.map(h => ({
                id: h.id,
                type: h.type,
                label: h.label
            }))
        };
    }
    
    /**
     * Deserialize JSON data to create/update node instance
     * @param {Object} data - Serialized node data
     * @returns {Object} Node instance data
     */
    deserialize(data) {
        return {
            id: data.id,
            type: data.type,
            name: data.name,
            x: data.x || 0,
            y: data.y || 0,
            handlers: data.handlers || this.getInitialHandlers()
        };
    }
    
    /**
     * Validate handler configuration
     * @param {Array} handlers - Handler array to validate
     * @returns {boolean} True if valid
     */
    validateHandlers(handlers) {
        return Array.isArray(handlers) && handlers.every(h => 
            h.id && h.type && ['source', 'target', 'basic_source'].includes(h.type)
        );
    }
}