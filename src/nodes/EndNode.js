// nodes/EndNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';
import { TargetVerticalHandlerDefinition } from '../handlers/TargetVerticalHandler.js';

export class EndNodeDefinition extends NodeDefinition {
    constructor(x, y) {
        super(x, y, 'end');
        this.type = 'end';
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
        this.handlers.push(new TargetVerticalHandlerDefinition(0, this.height / 2));
    }
    
    static getShapePath(d) {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const R  = CONFIG.node.largeBorderRadius;        
        const sR = CONFIG.node.smallBorderRadius;   
        const handlerDimensions = TargetVerticalHandlerDefinition.getDimension(d.handlers[0]);
        const targetHandlerWidth =  handlerDimensions.width/2+2;
        const targetHandlerHeightUp =  H/2 - handlerDimensions.height/2 - 2;
        const targetHandlerHeightDown =  H/2 + handlerDimensions.height/2 + 2;

        return `
            M ${sR},0
            L ${W - R},0
            A ${R},${R} 0 0 1 ${W},${R}
            L ${W},${H - R}
            A ${R},${R} 0 0 1 ${W - R},${H}
            L ${sR},${H}
            A ${sR},${sR} 0 0 1 0,${H - sR}
            L 0,${targetHandlerHeightDown}
            L ${targetHandlerWidth},${targetHandlerHeightDown} 
            L ${targetHandlerWidth},${targetHandlerHeightUp}
            L 0,${targetHandlerHeightUp}
            L 0,${sR}
            A ${sR},${sR} 0 0 1 ${sR},0
            Z
        `.replace(/\s+/g, ' ');
    }

}