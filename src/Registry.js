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
    
    registerNode(type, definition) { this.nodeDefinitions.set(type, definition); }
    registerHandler(type, definition) { this.handlerDefinitions.set(type, definition); }
    getNodeDefinition(type) { return this.nodeDefinitions.get(type); }
    getHandlerDefinition(type) { return this.handlerDefinitions.get(type); }
    getNodeTypes() { return Array.from(this.nodeDefinitions.keys()); }
}

export const registry = new Registry();

registry.registerNode('start', new StartNodeDefinition());
registry.registerNode('task', new TaskNodeDefinition());
registry.registerNode('end', new EndNodeDefinition());
registry.registerNode('switch', new SwitchNodeDefinition());
registry.registerNode('service', new ServiceNodeDefinition());

registry.registerHandler('source', new SourceHandlerDefinition());
//registry.registerHandler('target', new TargetHandlerDefinition());
registry.registerHandler('target_vertical', new TargetVerticalHandlerDefinition());
registry.registerHandler('target_horizontal', new TargetHorizontalHandlerDefinition());
registry.registerHandler('call', new CallHandlerDefinition());