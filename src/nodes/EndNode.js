// nodes/EndNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';

const DIMENSIONS = {
    width: 60,
    height: 60
}

export class EndNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'end';
    }
    
    getInitialHandlers() {
        return [
            { 
                type: 'target', 
                label: 'Input', 
                offset_x: 0, 
                offset_y: DIMENSIONS.height/2 
            }
        ];
    }
    
    getInitialData() {
        return {
            label: 'End',
            width: DIMENSIONS.width,
            height: DIMENSIONS.height
        };
    }
    
getShapePath() {
    const W = DIMENSIONS.width;
    const H = DIMENSIONS.height;
    const R  = CONFIG.node.largeBorderRadius;        
    const sR = CONFIG.node.smallBorderRadius;   

    return `
        M ${sR},0
        L ${W - R},0
        A ${R},${R} 0 0 1 ${W},${R}
        L ${W},${H - R}
        A ${R},${R} 0 0 1 ${W - R},${H}
        L ${sR},${H}
        A ${sR},${sR} 0 0 1 0,${H - sR}
        L 0,${sR}
        A ${sR},${sR} 0 0 1 ${sR},0
        Z
    `.replace(/\s+/g, ' ');
}
    
    getBodyClass() {
        return 'node-body end';
    }
}