export class Registry {
    constructor() {
        this.nodeDefinitions = new Map();
        this.handlerDefinitions = new Map();
        this.connectionDefinitions = new Map();
        this.strategyDefinitions = new Map();
    }

    _validateInterface(ClassRef, type, category) {
        const interfaces = {
            node: ['type', 'getRole'], // Required static getters/methods
            handler: ['type', 'getShapePath'],
            strategy: ['type', 'getVisitors', 'sortNodes']
        };

        const required = interfaces[category];
        if (!required) return;

        const missing = required.filter(prop => !(prop in ClassRef) && !(prop in ClassRef.prototype));
        
        // specific check for static 'type'
        if (!ClassRef.type) missing.push('static get type()');

        if (missing.length > 0) {
            throw new Error(`[Registry] Invalid ${category} plugin '${type}'. Missing implementation for: ${missing.join(', ')}`);
        }
    }

    registerStrategy(type, strategy) {
        this._validateInterface(strategy, type, 'strategy');
        this.strategyDefinitions.set(type, strategy);
    }

    registerNode(type, ClassRef) { 
        this._validateInterface(ClassRef, type, 'node');
        this.nodeDefinitions.set(type, ClassRef);
    }
    
    registerHandler(type, ClassRef) { 
        this._validateInterface(ClassRef, type, 'handler');
        this.handlerDefinitions.set(type, ClassRef);
    }

    getStrategy(type) { return this.strategyDefinitions.get(type); }
    getAllNodeDefinitions() { return Array.from(this.nodeDefinitions.values()); }
    getNodeDefinition(type) { return this.nodeDefinitions.get(type); }
    getHandlerDefinition(type) { return this.handlerDefinitions.get(type); }
    getNodeTypes() { return Array.from(this.nodeDefinitions.keys()); }
    getHandlerTypes() { return Array.from(this.handlerDefinitions.keys()); }
    registerConnection(type, ClassRef) { this.connectionDefinitions.set(type, ClassRef); }
    getConnectionDefinition(type) { return this.connectionDefinitions.get(type) || this.connectionDefinitions.get('default'); }
}