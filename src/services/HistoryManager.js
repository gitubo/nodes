/**
 * Optimized HistoryManager using Delta/Patch strategy.
 * Respects "Save-Before-Write" architecture by treating the Undo Stack
 * as a timeline of checkpoints.
 */
export class HistoryManager {
    constructor(maxDepth = 30, serializeFn, deserializeFn) {
        this.maxDepth = maxDepth;
        this.serialize = serializeFn;
        this.deserialize = deserializeFn;

        this.undoStack = [];
        this.redoStack = [];
        
        // This tracks the state at the TOP of the undo stack
        this.headState = null; 
    }

    save(newStateRaw) {
        const newState = this.serialize(newStateRaw);
        this.redoStack = []; // Clear redo on new branch

        // 1. Calculate Delta from current Head to New State
        // If headState is null (first save), diff against empty object
        const forwardPatch = this._diff(this.headState || { nodes: {}, connections: {} }, newState);
        
        // 2. Optimization: Ignore zero-change saves
        // (Prevents creating history steps when clicking without moving)
        if (this.headState && this._isEmptyPatch(forwardPatch)) return;

        // 3. Push Delta
        this.undoStack.push(forwardPatch);
        this.headState = newState;

        // 4. Enforce Limits
        if (this.undoStack.length > this.maxDepth) {
            // If we drop the bottom of the stack, we must "bake" that delta 
            // into the base, but since we only track headState, we just drop it.
            // Note: In a pure delta system, dropping the base is complex. 
            // For simplicity/performance trade-off here, we allow dropping history 
            // but ensure 'headState' remains valid.
            this.undoStack.shift();
        }
    }

    undo() {
        if (!this.canUndo()) return null;
        
        // 1. Pop the delta that got us here
        const patch = this.undoStack.pop();
        this.redoStack.push(patch);

        // 2. Apply inverse to head to go back in time
        this.headState = this._applyInversePatch(this.headState, patch);

        // 3. Return the RESTORED state (Fix: was returning stateToRestore which was captured before the update)
        return this.deserialize(this.headState);
    }

    redo() {
        if (!this.canRedo()) return null;

        // 1. Get Patch
        const patch = this.redoStack.pop();
        
        // 2. Advance Head
        this.headState = this._applyPatch(this.headState, patch);
        this.undoStack.push(patch);

        // 3. Return new Head
        return this.deserialize(this.headState);
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }
    
    reset() {
        this.undoStack = [];
        this.redoStack = [];
        this.headState = null;
    }

    // --- Diffing Engine ---

    _diff(oldS, newS) {
        // We store the *Previous* value for Undo purposes (Backward Patching)
        // and the *New* value is implicit when moving forward? 
        // Actually, to keep it simple and efficient:
        // We store: { key: { old: v1, new: v2 } }
        
        const delta = { nodes: {}, connections: {}, viewport: newS.metadata?.viewport };
        
        this._diffMap(oldS.nodes, newS.nodes, delta.nodes);
        this._diffMap(oldS.connections, newS.connections, delta.connections);
        
        return delta;
    }

    _diffMap(oldMap = {}, newMap = {}, output) {
        const allKeys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
        
        allKeys.forEach(key => {
            const oldVal = oldMap[key];
            const newVal = newMap[key];
            const oldStr = JSON.stringify(oldVal);
            const newStr = JSON.stringify(newVal);

            if (oldStr !== newStr) {
                // Store both for reversible history
                output[key] = { old: oldVal, new: newVal };
            }
        });
    }

    _applyPatch(state, patch) {
        const next = JSON.parse(JSON.stringify(state)); // Deep Clone
        if (patch.viewport) next.metadata = { ...next.metadata, viewport: patch.viewport };
        
        this._applyMap(next.nodes, patch.nodes, 'new');
        this._applyMap(next.connections, patch.connections, 'new');
        return next;
    }

    _applyInversePatch(state, patch) {
        const prev = JSON.parse(JSON.stringify(state)); // Deep Clone
        // Note: Viewport undo might require explicit 'old' storage if purely relying on patch
        // For now, we accept viewport might stay unless explicitly tracked.
        
        this._applyMap(prev.nodes, patch.nodes, 'old');
        this._applyMap(prev.connections, patch.connections, 'old');
        return prev;
    }

    _applyMap(collection, deltaMap, field) {
        Object.keys(deltaMap).forEach(key => {
            const change = deltaMap[key];
            if (change[field] === undefined) {
                // If 'new' is undefined, it means it was deleted.
                // If 'old' is undefined, it means it didn't exist before.
                delete collection[key];
            } else {
                collection[key] = change[field];
            }
        });
    }

    _isEmptyPatch(patch) {
        return Object.keys(patch.nodes).length === 0 && 
               Object.keys(patch.connections).length === 0;
    }
}