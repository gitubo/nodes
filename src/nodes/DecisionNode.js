// nodes/DecisionNode.js - Example of a custom node definition
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';

export class DecisionNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'decision';
    }
    
    /**
     * Define initial handlers: 1 input, 2 outputs (yes/no)
     */
    getInitialHandlers() {
        return [
            { type: 'target', label: 'Input' },
            { type: 'source', label: 'Yes' },
            { type: 'source', label: 'No' }
        ];
    }
    
    /**
     * Initial data for decision nodes
     */
    getInitialData() {
        return {
            name: 'Decision',
            condition: ''
        };
    }
    
    /**
     * Diamond shape path
     */
    getShapePath() {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const centerX = W / 2;
        const centerY = H / 2;
        
        return `M ${centerX},0 L ${W},${centerY} L ${centerX},${H} L 0,${centerY} Z`;
    }
    
    /**
     * Custom CSS class
     */
    getBodyClass() {
        return 'node-body decision';
    }
    
    /**
     * Custom serialization - include condition
     */
    serialize(node) {
        const base = super.serialize(node);
        return {
            ...base,
            condition: node.condition || ''
        };
    }
    
    /**
     * Custom deserialization - restore condition
     */
    deserialize(data) {
        const base = super.deserialize(data);
        return {
            ...base,
            condition: data.condition || ''
        };
    }
}