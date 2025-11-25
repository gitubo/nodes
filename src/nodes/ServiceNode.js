// nodes/TaskNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js'; 
import { TargetHorizontalHandlerDefinition } from '../handlers/TargetHorizontalHandler.js';

export class ServiceNodeDefinition extends NodeDefinition {
    constructor(x, y, label, note, data) {
        super(x, y, label, note, data);
        this.type = 'service';
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
        this.handlers.push(new TargetHorizontalHandlerDefinition(this.width / 2, 0));
    }

    static getShapePath(d) {
        let path = "";
        path += "M20 1.8 "; 
        path += "A30 30 0 000 30 ";
        path += "A1 1 0 0060 30 ";
        path += "A30 30 0 0040 1.8 ";
        path += "L40 6";
        path += "L20 6";
        path += "Z";
        return path.replace(/\s+/g, ' ');
    }
}