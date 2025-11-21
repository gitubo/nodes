// nodes/EndNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';
import { TargetHandlerDefinition } from '../handlers/TargetHandler.js';


export class EndNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'end';
        this.width = 60;
        this.height = 60;
    }
    
    getHandlers() {
        return [
            { 
                type: 'target', 
                label: 'Input', 
                offset_x: 0, 
                offset_y: this.height/2 
            }
        ];
    }
    
    getData() {
        return {
            label: 'End',
            width: this.width,
            height: this.height
        };
    }
    
    getShapePath() {
        const W = this.width;
        const H = this.height;
        const R  = CONFIG.node.largeBorderRadius;        
        const sR = CONFIG.node.smallBorderRadius;   
        const targetHandlerWidth =  TargetHandlerDefinition.getDimension().width/2+2;
        const targetHandlerHeightUp =  H/2 - TargetHandlerDefinition.getDimension().height/2 - 2;
        const targetHandlerHeightDown =  H/2 + TargetHandlerDefinition.getDimension().height/2 + 2;

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