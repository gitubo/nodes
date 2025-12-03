// nodes/EndNode.js
import { NodeDefinition, NODE_ROLES } from './NodeDefinition.js';
import { CONFIG } from '../config.js';
import { TargetVerticalHandlerDefinition } from '../handlers/TargetVerticalHandler.js';

export class EndNodeDefinition extends NodeDefinition {
    constructor(x, y) {
        super(x, y, 'end');
        this.type = 'end';
        this.width = 192;
        this.height = 96;
        this.handlers.push(new TargetVerticalHandlerDefinition(0, this.height/2));
    }

    static hasTargetHandlers() { return true; }

    static getIconPath() { return 'M521.1 533V172Q453.6 177 389.25 160.5T272.7 109Q235.8 84 196.695 72T117 60Q101.7 60 85.95 62T53.1 68V307Q68.4 305 85.05 303.5T120.6 302Q173.7 302 226.8 318T325.8 364Q371.7 394 420.48 406 469.269 418 521.1 413ZM0 640V20Q43.2 9 68.85 4.5T117.9 0Q164.7 0 210.15 14.5T296.1 56Q338.4 84 386.1 98.5T482.094 113Q506.7 113 529.803 110.37 552.897 107.75 576 106V468.02Q552.6 470 529.65 473 506.7 476 483.597 476 436.5 476 391.05 462T304.2 420Q261 391 214.074 376.5T118.8 362Q103.5 362 88.2 363.5T54 369V640H0Z'; }

    
    getShapePath() {
        return 'M160 96 16 96A16 16 90 010 80L0 68 12 68 12 28 0 28 0 16A16 16 90 0116 0L160 0A32 32 90 01192 32L192 64A32 32 90 01160 96Z';
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const R  = CONFIG.node.largeBorderRadius;        
        const sR = CONFIG.node.smallBorderRadius;   
        const handlerDimensions = TargetVerticalHandlerDefinition.getDimension(this.handlers[0]);
        const targetHandlerWidth =  handlerDimensions.width/2 + CONFIG.handler.margin;
        const targetHandlerHeightUp =  H/2 - handlerDimensions.height/2 - CONFIG.handler.margin;
        const targetHandlerHeightDown =  H/2 + handlerDimensions.height/2 + CONFIG.handler.margin;

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