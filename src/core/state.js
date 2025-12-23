import { SelectionManager } from './SelectionManager.js';
import { HistoryManager } from '../services/HistoryManager.js';
import { Note } from '../components/Note.js';

export class Store {
    constructor(eventBus, serializationService, registry) {
        this.eventBus = eventBus;
        this.registry = registry;
        
        // 1. Selection Logic
        this.selection = new SelectionManager(eventBus);

        // 2. Pure Data State
        this.state = {
            nodes: [],
            links: [],
            notes: [],
            transform: { k: 1, x: 0, y: 0 },
        };

        // 3. Transient UI State (not saved)
        this.uiState = {
            ghostLink: null
        };

        // 4. Performance Cache
        this.cache = { 
            nodeLinks: new Map(),
            handlerAbsPos: new Map()
        };

        // 5. History Manager Setup
        this.history = new HistoryManager(
            30,
            (state) => serializationService.serialize(state),
            (data) => serializationService.deserialize(data)
        );

        // --- CRITICAL FIX: Wrap history.reset() ---
        // When Widget.js calls history.reset(), it usually wipes the 'headState' (baseline).
        // We override reset to wipe the stack BUT immediately save the current state 
        // as the new baseline. This prevents "Undo" from erasing the whole graph 
        // after a demo load.
        const originalReset = this.history.reset.bind(this.history);
        this.history.reset = () => {
            originalReset();
            // Force a save to set the new baseline (HEAD) without adding to the undo stack yet
            // logic: save() usually pushes to stack. We want headState set.
            // HistoryManager.save() sets headState. So calling it once is correct.
            // But we might want to clear the stack *after* saving? 
            // Actually, simplest is: Reset -> Save. The stack will have 1 entry (Initial), 
            // which is fine, or we accept that 'reset' implies 'start tracking from here'.
            this.history.save(this.state); 
        };
    }

    // --- Initialization ---

    initializeWithDefaults() {
        this.state = { nodes: [], links: [], notes: [], transform: { k: 1, x: 0, y: 0 } };
        this._rebuildCache();
        // Save the initial empty state so we can undo back to it if needed
        this._snapshot(); 
    }

    // --- Data Accessors ---
    
    get nodes() { return this.state.nodes; }
    get links() { return this.state.links; }
    get notes() { return this.state.notes; }
    
    getNode(id) { return this.state.nodes.find(n => n.id === id); }
    getLink(id) { return this.state.links.find(l => l.id === id); }
    getNote(id) { return this.state.notes.find(n => n.id === id); }

    // --- Mutations (Always Snapshot AFTER change) ---

    addNode(type, x, y, label='', data={}) {
        const Definition = this.registry.getNodeDefinition(type);
        if (!Definition) return console.error(`Unknown node type: ${type}`);
        
        const node = new Definition(x, y, label, '', data);
        this.state.nodes.push(node);
        
        this._rebuildCache(); // Cache positions immediately
        this.eventBus.emit('NODE_CREATED', node);
        this._snapshot(); // Save state
        return node;
    }

    removeNode(nodeId) {
        const nodeIndex = this.state.nodes.findIndex(n => n.id === nodeId);
        if (nodeIndex === -1) return;

        const removedNode = this.state.nodes.splice(nodeIndex, 1)[0];
        
        // Remove connected links
        const handlers = removedNode.handlers.map(h => h.id);
        const linksToRemove = this.state.links.filter(link => 
            handlers.includes(link.sourceHandlerId) || 
            handlers.includes(link.targetHandlerId)
        );

        this.state.links = this.state.links.filter(link => !linksToRemove.includes(link));

        this.selection.deselect(); 
        this._rebuildCache(); 
        
        this.eventBus.emit('NODE_REMOVED', nodeId);
        linksToRemove.forEach(l => this.eventBus.emit('CONNECTION_REMOVED', l));

        this._snapshot(); // Save state
    }

    updateNodePosition(id, x, y) {
        // High frequency update - NO SNAPSHOT here (performance)
        const node = this.getNode(id);
        if (node) {
            node.position.x = x;
            node.position.y = y;
            // Update cache for this specific node (optimization)
            node.handlers.forEach(h => {
                this.cache.handlerAbsPos.set(h.id, {
                     x: x + (h.offset.x || 0),
                     y: y + (h.offset.y || 0),
                     dir: h.direction
                 });
            });
            this.eventBus.emit('NODE_MOVED_HIGH_FREQ', node);
        }
    }

    commitNodePosition(id, oldPos, newPos) {
        // Called on MouseUp - SNAPSHOT here
        // We trigger the standard event and save history
        this.eventBus.emit('NODE_MOVED', { id, from: oldPos, to: newPos });
        this._snapshot();
    }

    updateNode(id, changes) {
        const node = this.getNode(id);
        if (!node) return;
        
        Object.assign(node, changes);
        
        // If data structure changed (e.g. Switch node ports), we might need to rebuild cache
        if (changes.data) this._rebuildCache();

        this.eventBus.emit('NODE_UPDATED', node);
        this._snapshot();
    }

    // --- Link Mutations ---

    addLink(sourceId, targetId, type = 'default', data = {}) {
        const LinkClass = this.registry.getConnectionDefinition(type);
        if (!LinkClass) return console.error(`Link type '${type}' not registered.`);

        const linkInstance = new LinkClass({
            sourceHandlerId: sourceId,
            targetHandlerId: targetId,
            data: data
        });

        this.state.links.push(linkInstance);
        
        this._rebuildCache();
        this.eventBus.emit('CONNECTION_CREATED', linkInstance);
        this._snapshot();
        return linkInstance;
    }

    updateLink(id, newData) {
        const link = this.getLink(id);
        if (!link) return;

        if (typeof link.update === 'function') {
            link.update(newData);
        } else {
            Object.assign(link, newData);
        }

        if (newData.sourceHandlerId || newData.targetHandlerId) {
            this._rebuildCache();
        }

        this.eventBus.emit('CONNECTION_UPDATED', link);
        this._snapshot();
    }

    removeLink(id) {
        const linkIndex = this.state.links.findIndex(link => link.id === id);
        if (linkIndex === -1) return false;

        const [removedLink] = this.state.links.splice(linkIndex, 1);
        
        this._rebuildCache(); 
        this.eventBus.emit('CONNECTION_REMOVED', removedLink);
        this._snapshot();
        return true;
    }

    // --- UI/Helper Methods ---

    setGhostLink(data) {
        this.uiState.ghostLink = data;
        this.eventBus.emit('GHOST_CONNECTION_UPDATED', data);
    }

    getLinksForNode(nodeId) {
        return this.cache.nodeLinks.get(nodeId) || [];
    }

    updateLinkLabelOffset(linkId, t) {
        const link = this.getLink(linkId);
        if (link) {
            if (!link.label) link.label = {};
            link.label.offset = Math.max(0, Math.min(1, t));
            this.eventBus.emit('CONNECTION_MOVED_HIGH_FREQ', link);
        }
    }

    commitLinkUpdate(linkId) {
        const link = this.getLink(linkId);
        if (link) {
            this.eventBus.emit('CONNECTION_UPDATED', link);
            this._snapshot();
        }
    }

    // --- Note Mutations ---

    addNote(x, y, text="New Note") {
        const note = {
            id: crypto.randomUUID(),
            x, y,
            width: 210, height: 120,
            text,
            style: { backgroundColor: "#E6EFFE", fontSize: "20px", color: "#34639E" }
        };
        this.state.notes.push(note);
        this.eventBus.emit('NOTE_CREATED', note);
        this._snapshot();
        return note;
    }

    updateNote(id, changes) {
        const note = this.getNote(id);
        if (!note) return;
        Object.assign(note, changes);
        this.eventBus.emit('NOTE_UPDATED', note);
        this._snapshot();
    }

    removeNote(id) {
        this.state.notes = this.state.notes.filter(n => n.id !== id);
        this.eventBus.emit('NOTE_REMOVED', id);
        this._snapshot();
    }

    // --- History & Persistence ---

    _snapshot() {
        // Save the current state to history
        this.history.save(this.state);
        this.eventBus.emit('HISTORY_CHANGED', { 
            canUndo: this.history.canUndo(), 
            canRedo: this.history.canRedo() 
        });
    }

    undo() {
        const previousState = this.history.undo();
        if (previousState) {
            this.loadState(previousState);
        }
    }

    redo() {
        const nextState = this.history.redo();
        if (nextState) {
            this.loadState(nextState);
        }
    }

    loadState(newState) {
        if (!newState) return;
        
        // Defensive: Ensure we have arrays
        this.state = {
            nodes: newState.nodes || [],
            links: newState.links || [],
            notes: newState.notes || this.state.notes || [], // Preserve notes if missing in save
            transform: newState.viewport || this.state.transform
        };

        this._rebuildCache(); 
        this.selection.deselect();
        
        this.eventBus.emit('STATE_LOADED', this.state);
        this.eventBus.emit('HISTORY_CHANGED', { 
            canUndo: this.history.canUndo(), 
            canRedo: this.history.canRedo() 
        });
    }

    // --- Caching Utilities ---

    _getNodeIdFromHandlerId(handlerId) {
        for (const node of this.state.nodes) {
            if (node.handlers.some(h => h.id === handlerId)) {
                return node.id;
            }
        }
        return null;
    }

    _rebuildCache() {
        this.cache.handlerAbsPos.clear();
        this.cache.nodeLinks.clear(); 

        // 1. Cache Handler Positions
        this.state.nodes.forEach(node => {
            if(!node.handlers) return;
            node.handlers.forEach(h => {
                this.cache.handlerAbsPos.set(h.id, {
                    x: node.position.x + (h.offset.x || 0),
                    y: node.position.y + (h.offset.y || 0),
                    dir: h.direction || 'right'
                });
            });
        });

        // 2. Cache Node<->Link relationships
        this.state.links.forEach(link => {
            const sourceNodeId = this._getNodeIdFromHandlerId(link.sourceHandlerId);
            const targetNodeId = this._getNodeIdFromHandlerId(link.targetHandlerId);

            const addLinkToCache = (nodeId, linkObj) => {
                 if (nodeId) {
                    if (!this.cache.nodeLinks.has(nodeId)) {
                        this.cache.nodeLinks.set(nodeId, []);
                    }
                    if (!this.cache.nodeLinks.get(nodeId).includes(linkObj)) {
                        this.cache.nodeLinks.get(nodeId).push(linkObj);
                    }
                }
            };

            addLinkToCache(sourceNodeId, link);
            addLinkToCache(targetNodeId, link);
        });
    }
}