export class HistoryManager {
    constructor(maxDepth, serializeFn, deserializeFn) {
        this.maxDepth = maxDepth;
        this.serialize = serializeFn;
        this.deserialize = deserializeFn;
        
        this.historyStack = []; // Stores past states (for Undo)
        this.redoStack = [];    // Stores future states (for Redo)
    }

    save(currentState) {
        // Clear redo stack on new action
        this.redoStack = []; 

        // Serialize current state and push to history
        const serializedState = this.serialize(currentState);
        this.historyStack.push(serializedState);

        // Enforce max depth
        if (this.historyStack.length > this.maxDepth) {
            this.historyStack.shift(); // Remove oldest item
        }
    }

    undo() {
        if (!this.canUndo()) return null;

        // 1. Move current state from history to redo stack
        const currentState = this.historyStack.pop(); 
        this.redoStack.push(currentState);

        // 2. Get previous state
        const prevState = this.historyStack[this.historyStack.length - 1]; 
        
        return this.deserialize(prevState); // Return the deserialized state
    }
    
    redo() {
        if (!this.canRedo()) return null;
        const nextState = this.redoStack.pop(); 
        this.historyStack.push(nextState);
        return this.deserialize(nextState); // Return the deserialized state
    }

    canUndo() {
        return this.historyStack.length > 1; 
    }

    canRedo() {
        return this.redoStack.length > 0;
    }
    
    reset() {
        this.historyStack = [];
        this.redoStack = [];
    }
}