// nodes/TaskNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js'; 
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';
import { TargetVerticalHandlerDefinition } from '../handlers/TargetVerticalHandler.js';

export class TaskNodeDefinition extends NodeDefinition {
    constructor(x, y, label, note, data) {
        super(x, y, label, note, data);
        this.type = 'task';
        this.label = 'task';
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
        this.handlers.push(new TargetVerticalHandlerDefinition(0, this.height / 2));
        this.handlers.push(new SourceHandlerDefinition(this.width, this.height / 2));
    }

    getIconPath() { return 'M180-180h44l472-471-44-44-472 471v44Zm-60 60v-128l575-574q8-8 19-12.5t23-4.5q11 0 22 4.5t20 12.5l44 44q9 9 13 20t4 22q0 11-4.5 22.5T823-694L248-120H120Zm659-617-41-41 41 41Zm-105 64-22-22 44 44-22-22Z'; }

    getShapePath() {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const sR = CONFIG.node.smallBorderRadius;
        const sourceHandler =  H/2 - (SourceHandlerDefinition.getDimension(this.handlers[1]).radius + CONFIG.handler.margin);
        const targetHandlerWidth =  TargetVerticalHandlerDefinition.getDimension(this.handlers[0]).width/2 + CONFIG.handler.margin;
        const targetHandlerHeightUp =  H/2 - TargetVerticalHandlerDefinition.getDimension(this.handlers[0]).height/2 - CONFIG.handler.margin;
        const targetHandlerHeightDown =  H/2 + TargetVerticalHandlerDefinition.getDimension(this.handlers[0]).height/2 + CONFIG.handler.margin;

        return `
            M ${sR},0
            L ${W - sR},0
            A ${sR},${sR} 0 0 1 ${W},${sR}
            L ${W},${sourceHandler}
            A 1,1 0 0 0 ${W},${H - sourceHandler}
            L ${W},${H - sR}
            A ${sR},${sR} 0 0 1 ${W - sR},${H}
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