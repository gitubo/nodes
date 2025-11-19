// Registry.js - Central registry for nodes and handlers
import { StartNodeDefinition } from './nodes/StartNode.js';
import { TaskNodeDefinition } from './nodes/TaskNode.js';
import { EndNodeDefinition } from './nodes/EndNode.js';
import { DecisionNodeDefinition } from './nodes/DecisionNode.js';
import { SourceHandlerDefinition } from './handlers/SourceHandler.js';
import { TargetHandlerDefinition } from './handlers/TargetHandler.js';

class Registry {
    constructor() {
        this.nodeDefinitions = new Map();
        this.handlerDefinitions = new Map();
    }
    
    /**
     * Register a node definition
     * @param {string} type - Node type identifier
     * @param {NodeDefinition} definition - Node definition instance
     */
    registerNode(type, definition) {
        this.nodeDefinitions.set(type, definition);
    }
    
    /**
     * Register a handler definition
     * @param {string} type - Handler type identifier
     * @param {HandlerDefinition} definition - Handler definition instance
     */
    registerHandler(type, definition) {
        this.handlerDefinitions.set(type, definition);
    }
    
    /**
     * Get node definition by type
     * @param {string} type - Node type
     * @returns {NodeDefinition}
     */
    getNodeDefinition(type) {
        return this.nodeDefinitions.get(type);
    }
    
    /**
     * Get handler definition by type
     * @param {string} type - Handler type
     * @returns {HandlerDefinition}
     */
    getHandlerDefinition(type) {
        return this.handlerDefinitions.get(type);
    }
    
    /**
     * Get all registered node types
     * @returns {Array<string>}
     */
    getNodeTypes() {
        return Array.from(this.nodeDefinitions.keys());
    }
    
    /**
     * Get all registered handler types
     * @returns {Array<string>}
     */
    getHandlerTypes() {
        return Array.from(this.handlerDefinitions.keys());
    }
}

// Create and configure global registry
export const registry = new Registry();

// Register built-in nodes
registry.registerNode('start', new StartNodeDefinition());
registry.registerNode('task', new TaskNodeDefinition());
registry.registerNode('end', new EndNodeDefinition());
registry.registerNode('decision', new DecisionNodeDefinition());

// Register built-in handlers
registry.registerHandler('source', new SourceHandlerDefinition());
registry.registerHandler('target', new TargetHandlerDefinition());