// nodes/EndNode.js
import { NodeDefinition } from './NodeDefinition.js';
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

    getIconPath() { return 'M579 533V172Q504 177 432.5 160.5T303 109Q262 84 218.55 72T130 60Q113 60 95.5 62T59 68V427Q76 425 94.5 423.5T134 422Q193 422 252 438T362 484Q413 514 467.2 526 521.41 538 579 533ZM0 720V20Q48 9 76.5 4.5T131 0Q183 0 233.5 14.5T329 56Q376 84 429 98.5T535.66 113Q563 113 588.67 110.37 614.33 107.75 640 106V588.02Q614 590 588.5 593 563 596 537.33 596 485 596 434.5 582T338 540Q290 511 237.86 496.5T132 482Q115 482 98 483.5T60 489V720H0Z'; }

    
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