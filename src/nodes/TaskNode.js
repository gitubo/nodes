// nodes/TaskNode.js
import { NodeDefinition } from './NodeDefinition.js';

export class TaskNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'task';
    }
    
    getInitialHandlers() {
        return [
            { type: 'target', label: 'Input' },
            { type: 'source', label: 'Output' }
        ];
    }
    
    getInitialData() {
        return {
            name: 'Task Name',
            label: 'Task'
        };
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