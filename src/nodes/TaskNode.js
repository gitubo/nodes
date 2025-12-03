// nodes/TaskNode.js
import { NodeDefinition, NODE_ROLES } from './NodeDefinition.js';
import { CONFIG } from '../config.js'; 
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';
import { TargetVerticalHandlerDefinition } from '../handlers/TargetVerticalHandler.js';

export class TaskNodeDefinition extends NodeDefinition {
    constructor(x, y, _label, note, data) {
        super(x, y, 'task', note, data);
        this.type = 'task';
        this.width = 192;
        this.height = 96;
        this.handlers.push(new TargetVerticalHandlerDefinition(0, this.height/2));
        this.handlers.push(new SourceHandlerDefinition(this.width, this.height/2));
    }

    static getRole() { return NODE_ROLES.TOOLS; }

    static hasTargetHandlers() { return true; }

    static getIconPath() { return `M18.14 11.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L1.74 7.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM11 14.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z`; }

    getShapePath() {
        return 'M32 0 176 0A16 16 90 01192 16L192 28A20 20 90 00192 68L192 80A16 16 90 01176 96L16 96A16 16 90 010 80L0 68 12 68 12 28 0 28 0 16A16 16 90 0116 0Z';
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