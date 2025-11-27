// src/HistoryManager.js

/**
 * Manages the undo/redo stack using serialized state snapshots.
 * Uses the efficient stack/current pointer model.
 */
export class HistoryManager {
    constructor(limit = 30) {
        this.stack = [];
        this.current = -1; // Pointer to the current state in the stack
        this.limit = limit;
    }

    canUndo() {
        return this.current > 0;
    }
    
    canRedo() {
        return this.current < this.stack.length - 1;
    }

    /**
     * Saves a new state snapshot. Clears the redo stack.
     * @param {object} state - L'oggetto stato da salvare.
     */
    save(state) {
        if (!state || typeof state !== 'object') {
            return;
        }

        try {
            const serializedState = JSON.stringify(state);
            
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
     * Moves pointer backward and returns the previous state object.
     */
    undo() {
        if (!this.canUndo()) return null;

        this.current--;
        const stateString = this.stack[this.current];
        
        // FIX CRITICO: Intercetta valori nulli, undefined o stringhe corrotte
        if (!stateString || stateString === "undefined") {
            console.warn("History corrupted: Skipping invalid state entry on undo.");
            return this.undo(); 
        }
        
        try {
            return JSON.parse(stateString);
        } catch (e) {
            console.error("History corrupted: Failed to parse JSON on undo.", e);
            return null; 
        }
    }

    /**
     * Moves pointer forward and returns the next state object.
     */
    redo() {
        if (!this.canRedo()) return null;
        
        this.current++;
        const stateString = this.stack[this.current];
        
        // FIX CRITICO: Intercetta valori nulli, undefined o stringhe corrotte
        if (!stateString || stateString === "undefined") {
             console.warn("History corrupted: Skipping invalid state entry on redo.");
             return this.redo(); 
        }

        try {
            return JSON.parse(stateString);
        } catch (e) {
            console.error("History corrupted: Failed to parse JSON on redo.", e);
            return null;
        }
    }
}