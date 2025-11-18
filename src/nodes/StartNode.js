// nodes/StartNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';

export class StartNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'start';
    }
    
    getInitialHandlers() {
        return [
            { type: 'source', label: 'Output' }
        ];
    }
    
    getInitialData() {
        return {
            label: 'Start'
        };
    }
    
    getShapePath() {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const R = CONFIG.node.borderRadius;
        // Left-rounded rectangle
        return `M ${R},0 L ${W},0 L ${W},${H} L ${R},${H} A ${R},${R} 0 0 1 0,${H-R} L 0,${R} A ${R},${R} 0 0 1 ${R},0 Z`;
    }
    
    getBodyClass() {
        return 'node-body start';
    }
}