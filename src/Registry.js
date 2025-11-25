import { StartNodeDefinition } from './nodes/StartNode.js';
import { TaskNodeDefinition } from './nodes/TaskNode.js';
import { EndNodeDefinition } from './nodes/EndNode.js';
import { SwitchNodeDefinition } from './nodes/SwitchNode.js';
import { ServiceNodeDefinition } from './nodes/ServiceNode.js';
import { SourceHandlerDefinition } from './handlers/SourceHandler.js';
import { TargetVerticalHandlerDefinition } from './handlers/TargetVerticalHandler.js';
import { TargetHorizontalHandlerDefinition } from './handlers/TargetHorizontalHandler.js';
import { CallHandlerDefinition } from './handlers/CallHandler.js';

class Registry {
    constructor() {
        this.nodeDefinitions = new Map();
        this.handlerDefinitions = new Map();
    }
    
    registerNode(type, ClassRef) { this.nodeDefinitions.set(type, ClassRef); }
    registerHandler(type, ClassRef) { this.handlerDefinitions.set(type, ClassRef); }
    getNodeDefinition(type) { return this.nodeDefinitions.get(type); }
    getHandlerDefinition(type) { return this.handlerDefinitions.get(type); }
    getNodeTypes() { return Array.from(this.nodeDefinitions.keys()); }
    getHandlerTypes() { return Array.from(this.handlerDefinitions.keys()); }
}

export const registry = new Registry();

// Nodes
registry.registerNode('start', StartNodeDefinition);
registry.registerNode('end', EndNodeDefinition);
registry.registerNode('task', TaskNodeDefinition);
registry.registerNode('service', ServiceNodeDefinition);
registry.registerNode('switch', SwitchNodeDefinition);

// Handlers
registry.registerHandler('source', SourceHandlerDefinition);
//registry.registerHandler('target', new TargetHandlerDefinition());
registry.registerHandler('target_vertical', TargetVerticalHandlerDefinition);
registry.registerHandler('target_horizontal', TargetHorizontalHandlerDefinition);

/*

registry.registerHandler('call', CallHandlerDefinition);
*/