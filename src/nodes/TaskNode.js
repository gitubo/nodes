// nodes/TaskNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js'; 
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';
import { TargetVerticalHandlerDefinition } from '../handlers/TargetVerticalHandler.js';

export class TaskNodeDefinition extends NodeDefinition {
    constructor(x, y, label, note, data) {
        super(x, y, label, note, data);
        this.type = 'task';
        this.width = 192;
        this.height = 96;
        this.handlers.push(new TargetVerticalHandlerDefinition(0, this.height/2));
        this.handlers.push(new SourceHandlerDefinition(this.width, this.height/2));
    }
    static hasTargetHandlers() { return true; }

    getIconPath() { return 'M585 713 327 453Q304 461 281 466T234 471Q136.92 471 68.96 403.33 1 335.67 1 239 1 208 9.16 178.61T32 123L177 268 269 182 120 33Q145.91 17.84 174.96 9.42 204 1 234 1 333.17 1 402.58 70.42 472 139.83 472 239 472 263 467 286T454 332L713 590Q724 600.96 724 616.48T713 643L637 713Q626.3 724 611.15 724 596 724 585 713ZM613 656 653 616 380 343Q396 322 404 293.5T412 239Q412 164 356.5 112T230 59L332 163Q341 172 340.5 184.5T331 206L198 331Q188.73 339 176.36 339 164 339 156 331L58 234Q61 311 112.67 361T234 411Q259 411 287 403T336 379L613 656ZM356 357Z'; }

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