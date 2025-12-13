export class Registry {
    constructor() {
        this.nodeDefinitions = new Map();
        this.handlerDefinitions = new Map();
        this.connectionDefinitions = new Map();
    }
    
    registerNode(type, ClassRef) { 
        this.nodeDefinitions.set(type, ClassRef);
    }

    getAllNodeDefinitions() {
        return Array.from(this.nodeDefinitions.values()); 
    }
    
    registerHandler(type, ClassRef) { 
        this.handlerDefinitions.set(type, ClassRef); 
    }
    
    getNodeDefinition(type) { 
        return this.nodeDefinitions.get(type);
    }
    
    getHandlerDefinition(type) { 
        return this.handlerDefinitions.get(type); 
    }
    
    getNodeTypes() { 
        return Array.from(this.nodeDefinitions.keys());
    }
    
    getHandlerTypes() { 
        return Array.from(this.handlerDefinitions.keys()); 
    }

    registerConnection(type, ClassRef) {
        this.connectionDefinitions.set(type, ClassRef);
    }

    getConnectionDefinition(type) {
        return this.connectionDefinitions.get(type) || this.connectionDefinitions.get('default');
    }
}