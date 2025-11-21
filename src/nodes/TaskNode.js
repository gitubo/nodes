// nodes/TaskNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js'; 
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';
import { TargetHandlerDefinition } from '../handlers/TargetHandler.js';

export class TaskNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'task';
        this.width = 120;
        this.height = 60;
    }

    getDimensions(d) {
        return {
            width: 120,
            height: 60
        };
    }

    
    getHandlers() {
        return [
            { 
                type: 'target', 
                label: 'input',
                offset_x: 0,          
                offset_y: this.height / 2       
            }
            ,
            { 
                type: 'source', 
                label: 'output',
                offset_x: this.width,          
                offset_y: this.height / 2       
            }
        ];
    }
    
    getData() {
        return {
            label: 'Task',
            sublabel: 'Name',
            width: this.width,
            height: this.height
        };
    }

    getShapePath() {
        const W = this.width;
        const H = this.height;
        const sR = CONFIG.node.smallBorderRadius;
        const sourceHandler =  H/2 - (SourceHandlerDefinition.getDimension().radius+2);
        const targetHandlerWidth =  TargetHandlerDefinition.getDimension().width/2+2;
        const targetHandlerHeightUp =  H/2 - TargetHandlerDefinition.getDimension().height/2 - 2;
        const targetHandlerHeightDown =  H/2 + TargetHandlerDefinition.getDimension().height/2 + 2;

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

    
    serialize(node) {
        // Custom serialization for task nodes
        const base = super.serialize(node);
        return {
            ...base,
            customData: node.customData || {}
        };
    }
    
    deserialize(data) {
        const base = super.deserialize(data);
        return {
            ...base,
            customData: data.customData || {}
        };
    }
}