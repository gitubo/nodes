// nodes/TaskNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js'; 

const DIMENSIONS = {
    width: 120,
    height: 60
}

export class TaskNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'task';
    }
    
    getInitialHandlers() {
        return [
            { 
                type: 'target', 
                label: 'Input',
                offset_x: 0,          
                offset_y: DIMENSIONS.height / 2       
            },
            { 
                type: 'source', 
                label: 'Output',
                offset_x: DIMENSIONS.width,          
                offset_y: DIMENSIONS.height / 2       
            }
        ];
    }
    
    getInitialData() {
        return {
            label: 'Task',
            sublabel: 'Name',
            width: DIMENSIONS.width,
            height: DIMENSIONS.height
        };
    }

    getShapePath() {
        const W = DIMENSIONS.width;
        const H = DIMENSIONS.height;
        const sR = CONFIG.node.smallBorderRadius; 

        return `
            M ${sR},0
            L ${W - sR},0
            A ${sR},${sR} 0 0 1 ${W},${sR}
            L ${W},${H - sR}
            A ${sR},${sR} 0 0 1 ${W - sR},${H}
            L ${sR},${H}
            A ${sR},${sR} 0 0 1 0,${H - sR}
            L 0,${sR}
            A ${sR},${sR} 0 0 1 ${sR},0
            Z
        `.replace(/\s+/g, ' ');
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