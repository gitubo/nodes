// src/HistoryManager.js

/**
 * Manages the undo/redo stack using serialized state snapshots.
 */
export class HistoryManager {
    constructor(limit = 30, serializeFn, deserializeFn) {
        this.stack = [];
        this.current = -1; // Pointer to the current state in the stack
        this.limit = limit;
        this.serialize = serializeFn;
        this.deserialize = deserializeFn;
    }

    canUndo() {
        return this.current > 0;
    }
    
    canRedo() {
        return this.current < this.stack.length - 1;
    }

    /**
     * Saves a new state snapshot. Clears the redo stack.
     * @param {object} state - The raw state object to save.
     */
    save(state) {
        if (!state || typeof state !== 'object') {
            return;
        }

        try {
            // Use the injected serializer
            const serializedData = this.serialize(state);
            const serializedState = JSON.stringify(serializedData);
            
            this.current++;
            
            if (this.current >= this.limit) {
                this.stack.shift();
                this.current--;
            }

            this.stack[this.current] = serializedState;
            
            this.stack.splice(this.current + 1);
        } catch (e) {
            console.error("History save failed during JSON serialization.", e);
            this.current--;
        }
    }

    /**
     * Moves pointer backward and returns the previous deserialized state.
     */
    undo() {
        if (!this.canUndo()) return null;

        this.current--;
        const stateString = this.stack[this.current];
        
        if (!stateString || stateString === "undefined") {
            console.warn("History corrupted: Skipping invalid state entry on undo.");
            return this.undo(); 
        }
        
        try {
            // Use the injected deserializer
            const data = JSON.parse(stateString);
            return this.deserialize(data);
        } catch (e) {
            console.error("History corrupted: Failed to parse JSON on undo.", e);
            return null; 
        }
    }

    /**
     * Moves pointer forward and returns the next deserialized state.
     */
    redo() {
        if (!this.canRedo()) return null;
        
        this.current++;
        const stateString = this.stack[this.current];
        
        if (!stateString || stateString === "undefined") {
             console.warn("History corrupted: Skipping invalid state entry on redo.");
             return this.redo(); 
        }

        try {
            // Use the injected deserializer
            const data = JSON.parse(stateString);
            return this.deserialize(data);
        } catch (e) {
            console.error("History corrupted: Failed to parse JSON on redo.", e);
            return null;
        }
    }
}