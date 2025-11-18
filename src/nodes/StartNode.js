// nodes/StartNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';

const DIMENSIONS = {
    width: 60,
    height: 60
}

export class StartNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'start';
    }
    
    getInitialHandlers() {
        return [
            { 
                type: 'source', 
                label: 'Output',
                offset_x: DIMENSIONS.width,          // Posizione X: Larghezza intera del nodo
                offset_y: DIMENSIONS.height / 2       // Posizione Y: Centro del nodo
            }
        ];
    }
    
    getInitialData() {
        return {
            label: 'Start',
            width: DIMENSIONS.width,
            height: DIMENSIONS.height
        };
    }
    
    getShapePath() {
        const W = DIMENSIONS.width;
        const H = DIMENSIONS.height;
        const R = CONFIG.node.largeBorderRadius;           
        const sR = CONFIG.node.smallBorderRadius;     

        return `
            M ${R},0
            L ${W - sR},0
            A ${sR},${sR} 0 0 1 ${W},${sR}
            L ${W},${H - sR}
            A ${sR},${sR} 0 0 1 ${W - sR},${H}
            L ${R},${H}
            A ${R},${R} 0 0 1 0,${H - R}
            L 0,${R}
            A ${R},${R} 0 0 1 ${R},0
            Z
        `.replace(/\s+/g, ' ');
    }

    
    getBodyClass() {
        return 'node-body start';
    }
}