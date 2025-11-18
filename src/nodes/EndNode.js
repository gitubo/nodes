// nodes/EndNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';

export class EndNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'end';
    }
    
    getInitialHandlers() {
        return [
            { type: 'target', label: 'Input' }
        ];
    }
    
    getInitialData() {
        return {
            label: 'End'
        };
    }
    
    getShapePath() {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const R = CONFIG.node.borderRadius;
        // Right-rounded rectangle
        return `M 0,0 L ${W-R},0 A ${R},${R} 0 0 1 ${W},${R} L ${W},${H-R} A ${R},${R} 0 0 1 ${W-R},${H} L 0,${H} Z`;
    }
    
    getBodyClass() {
        return 'node-body end';
    }
}