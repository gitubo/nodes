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
        this.handlers.push(new TargetVerticalHandlerDefinition(0, CONFIG.node.handlerSeparator * 2));
    }

    getIconPath() { return 'M739-307v-361q-75 5-146.5-11.5T463-731q-41-25-84.45-37T290-780q-17 0-34.5 2t-36.5 6v359q17-2 35.5-3.5T294-418q59 0 118 16t110 46q51 30 105.2 42 54.21 12 111.8 7ZM160-120v-700q48-11 76.5-15.5T291-840q52 0 102.5 14.5T489-784q47 28 100 42.5T695.66-727q27.34 0 53.01-2.63 25.66-2.62 51.33-4.37v482.02Q774-250 748.5-247q-25.5 3-51.17 3-52.33 0-102.83-14T498-300q-48-29-100.14-43.5T292-358q-17 0-34 1.5t-38 5.5v231h-60Z'; }

    
    getShapePath() {
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