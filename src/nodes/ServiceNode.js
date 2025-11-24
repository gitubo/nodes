// nodes/TaskNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js'; 

export class ServiceNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'service';
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
        this.handlers = [
            { type: 'target_horizontal', label: '', offset_x: CONFIG.node.width/2, offset_y: 0 }
        ];
    }
    
    getData() {
        return {
            label: 'service',
            sublabel: '',
            width: this.width,
            height: this.height
        };
    }

    getShapePath() {
        const DIAM = this.width;
        const RADIUS = DIAM/2;

        const vars = {
            "${DIAM}": DIAM,
            "${RADIUS}": RADIUS,
        };

        // M19 1A30 30 0 000 30 1 1 0 0060 30 30 30 0 0041 1L30 12Z
        // M21 1.5A30 30 0 000 30 1 1 0 0060 30 30 30 0 0039 1.5L39 5 21 5Z
        let path = "";
        path += "M20 1.8 "; 
        path += "A30 30 0 000 30 ";
        path += "A1 1 0 0060 30 ";
        path += "A30 30 0 0040 1.8 ";
        path += "L40 6";
        path += "L20 6";
        //path += "A1 1 0 0119 0 ";
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