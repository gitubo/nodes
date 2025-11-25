// nodes/TaskNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js'; 
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';
import { TargetVerticalHandlerDefinition } from '../handlers/TargetVerticalHandler.js';

export class TaskNodeDefinition extends NodeDefinition {
    constructor(x, y, label, note, data) {
        super(x, y, label, note, data);
        this.type = 'task';
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
        this.handlers.push(new TargetVerticalHandlerDefinition(0, this.height / 2));
        this.handlers.push(new SourceHandlerDefinition(this.width, this.height / 2));
    }

    static getShapePath(d) {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;;
        const sR = CONFIG.node.smallBorderRadius;
        const sourceHandler =  H/2 - (SourceHandlerDefinition.getDimension(d.handlers[1]).radius+2);
        const targetHandlerWidth =  TargetVerticalHandlerDefinition.getDimension(d.handlers[0]).width/2+2;
        const targetHandlerHeightUp =  H/2 - TargetVerticalHandlerDefinition.getDimension(d.handlers[0]).height/2 - 2;
        const targetHandlerHeightDown =  H/2 + TargetVerticalHandlerDefinition.getDimension(d.handlers[0]).height/2 + 2;

        const vars = {
            "${sR}": sR,
            "${W}": W,
            "${H}": H,
            "${W - sR}": W-sR,
            "${H - sR}": H-sR,
            "${H - sourceHandler}": H-sourceHandler,
            "${sourceHandler}": sourceHandler,
            "${targetHandlerWidth}": targetHandlerWidth,
            "${targetHandlerHeightUp}": targetHandlerHeightUp,
            "${targetHandlerHeightDown}": targetHandlerHeightDown,
        };
        
        let path = "";
        path += "M ${sR},0 ";
        path += "L ${W - sR},0 ";
        path += "A ${sR},${sR} 0 0 1 ${W},${sR} ";
        path += "L ${W},${sourceHandler} ";
        path += "A 1,1 0 0 0 ${W},${H - sourceHandler} ";
        path += "L ${W},${H - sR} ";
        path += "A ${sR},${sR} 0 0 1 ${W - sR},${H} ";
        path += "L ${sR},${H} ";
        path += "A ${sR},${sR} 0 0 1 0,${H - sR} ";
        path += "L 0,${targetHandlerHeightDown} ";
        path += "L ${targetHandlerWidth},${targetHandlerHeightDown} ";
        path += "L ${targetHandlerWidth},${targetHandlerHeightUp} ";
        path += "L 0,${targetHandlerHeightUp} ";
        path += "L 0,${sR} ";
        path += "A ${sR},${sR} 0 0 1 ${sR},0 ";
        path += "Z";

        for (const key in vars) {
            const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
            path = path.replace(regex, vars[key]);
        }

        return path.replace(/\s+/g, ' ');
    }
}