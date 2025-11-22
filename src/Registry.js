import { StartNodeDefinition } from './nodes/StartNode.js';
import { TaskNodeDefinition } from './nodes/TaskNode.js';
import { EndNodeDefinition } from './nodes/EndNode.js';
import { SwitchNodeDefinition } from './nodes/SwitchNode.js'; // Changed from Decision
import { SourceHandlerDefinition } from './handlers/SourceHandler.js';
import { TargetHandlerDefinition } from './handlers/TargetHandler.js';

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
registry.registerNode('switch', new SwitchNodeDefinition()); // Registered as switch

registry.registerHandler('source', new SourceHandlerDefinition());
registry.registerHandler('target', new TargetHandlerDefinition());