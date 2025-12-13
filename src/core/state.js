import { SelectionManager } from './SelectionManager.js';
import { HistoryManager } from '../services/HistoryManager.js';
import { Note } from '../components/Note.js';

export class Store {
    constructor(eventBus, serializationService, registry) {
        this.eventBus = eventBus;
        this.registry = registry;
        
        // 1. Separation: Selection Logic isolated
        this.selection = new SelectionManager(eventBus);

        // 2. Data State (Pure)
        this.state = {
            nodes: [],
            links: [],
            notes: [],
            transform: { k: 1, x: 0, y: 0 },
        };

        // 3. UI State (Transient, not saved)
        this.uiState = {
            ghostLink: null
        };

        this.cache = { 
            nodeLinks: new Map(),
            handlerAbsPos: new Map()
        };

        // 4. Separation: History Logic isolated
        this.history = new HistoryManager(
            30,
            (state) => serializationService.serialize(state),
            (data) => serializationService.deserialize(data)
        );
    }

    // --- Data Accessors ---
    get nodes() { return this.state.nodes; }
    get links() { return this.state.links; }
    get notes() { return this.state.notes; }
    
    getNode(id) { return this.state.nodes.find(n => n.id === id); }
    getLink(id) { return this.state.links.find(l => l.id === id); }
    getNote(id) { return this.state.notes.find(n => n.id === id); }

    addNode(type, x, y, label='', data={}) {
        this._snapshot();
        const Definition = this.registry.getNodeDefinition(type);
        if (!Definition) return console.error(`Unknown node type: ${type}`);
        
        const node = new Definition(x, y, label, '', data);
        this.state.nodes.push(node);
        this.eventBus.emit('NODE_CREATED', node);
        return node;
    }

    removeNode(nodeId) {
        this._snapshot();         
        const nodeIndex = this.state.nodes.findIndex(n => n.id === nodeId);
        if (nodeIndex === -1) return;

        const removedNode = this.state.nodes.splice(nodeIndex, 1)[0];
        const handlers = removedNode.handlers.map(h => h.id);
        
        this.state.links = this.state.links.filter(link => 
            !handlers.includes(link.sourceHandlerId) && 
            !handlers.includes(link.targetHandlerId)
        );

        this._rebuildCache(); 
        this.selection.deselect(); // Deselect the removed node
        this.eventBus.emit('NODE_REMOVED', nodeId);
    }

    updateNodePosition(id, x, y) {
        const node = this.getNode(id);
        if (node) {
            // Update the position object
            node.position.x = x;
            node.position.y = y;
            node.handlers.forEach(h => {
                this.cache.handlerAbsPos.set(h.id, {
                     x: x + (h.offset.x || 0),
                     y: y + (h.offset.y || 0),
                     dir: h.direction
                });
            });
            // Emit high-frequency event. render.js uses this for immediate link updates.
            this.eventBus.emit('NODE_MOVED_HIGH_FREQ', node);
        }
    }

    commitNodePosition(id, oldPos, newPos) {
        this._snapshot(); // Save history only on commit
        this.eventBus.emit('NODE_MOVED', { id, from: oldPos, to: newPos });
    }

    addLink(sourceId, targetId, type = 'default', data = {}) {
        this._snapshot();
        
        // 1. Recupera la classe dal Registry (es. ConnectionDefinition standard o custom)
        const LinkClass = this.registry.getConnectionDefinition(type);
        
        if (!LinkClass) {
            console.error(`Link type '${type}' not registered.`);
            return;
        }

        // 2. Istanzia la classe
        // Nota: Passiamo un oggetto di configurazione come deciso nel costruttore
        const linkInstance = new LinkClass({
            sourceHandlerId: sourceId,
            targetHandlerId: targetId,
            data: data
            // style, label, etc. prendono i valori di default della classe
        });

        // 3. Salva l'istanza nello stato
        this.state.links.push(linkInstance);
        
        this._rebuildCache();
        this.eventBus.emit('CONNECTION_CREATED', linkInstance);
        
        return linkInstance;
    }

    updateLink(id, newData) {
        const link = this.getLink(id);
        if (!link) {
            console.warn(`Attempted to update non-existent link with ID: ${id}`);
            return;
        }

        this._snapshot(); 
        
        // --- FIX: Usa il metodo dell'istanza invece di Object.assign ---
        if (typeof link.update === 'function') {
            link.update(newData);
        } else {
            // Fallback per sicurezza (o per vecchi oggetti non migrati)
            Object.assign(link, newData);
        }

        this.eventBus.emit('CONNECTION_UPDATED', link);
        
        // Ricostruisci la cache se cambia la topologia
        if (newData.sourceHandlerId || newData.targetHandlerId) {
            this._rebuildCache();
        }
    }

    removeLink(id) {
        // 1. Snapshot per l'HistoryManager (Undo/Redo)
        this._snapshot(); 

        const initialLength = this.state.links.length;
        
        // Trova e rimuovi il link
        const linkIndex = this.state.links.findIndex(link => link.id === id);
        
        if (linkIndex === -1) {
            console.warn(`Attempted to remove non-existent link with ID: ${id}`);
            return false;
        }

        // Rimuove 1 elemento a partire dall'indice trovato
        const [removedLink] = this.state.links.splice(linkIndex, 1);
        
        if (removedLink) {
            // 2. Aggiornamento della Cache
            // È più semplice e sicuro ricostruire l'intera cache dei nodi/link 
            // dopo un'operazione distruttiva, dato che è veloce.
            this._rebuildCache(); 
            
            // 3. Emetti l'evento per il Renderer
            this.eventBus.emit('CONNECTION_REMOVED', removedLink);
            
            return true;
        }

        return false;
    }

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
            this._snapshot(); // Save the new labelOffset
            // Emit regular event to ensure final render is committed
            this.eventBus.emit('CONNECTION_UPDATED', link); 
        }
    }

    addNote(x, y, text="New Note") {
        this._snapshot();
        const note = {
            id: crypto.randomUUID(),
            x, y,
            width: 210, height: 120,
            text,
            style: { backgroundColor: "#E6EFFE", fontSize: "20px", color: "#34639E" }
        };
        this.state.notes.push(note);
        this._rebuildCache(); 
        this.eventBus.emit('NOTE_CREATED', note);
        return note;
    }

    updateNode(id, changes) {
        const node = this.getNode(id);
        if (!node) return;
        this._snapshot(); 
        Object.assign(node, changes);
        this.eventBus.emit('NODE_UPDATED', node);
    }

    removeNote(id) {
        this._snapshot();
        this.state.notes = this.state.notes.filter(n => n.id !== id);
        this._rebuildCache(); 
        this.eventBus.emit('NOTE_REMOVED', id);
    }

    _snapshot() {
        this.history.save(this.state);
        this.eventBus.emit('HISTORY_CHANGED', { canUndo: this.history.canUndo(), canRedo: this.history.canRedo() });
    }

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
        
        // O(N) Loop to cache all handler positions once
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

        this.cache.nodeLinks.clear(); 

        this.state.links.forEach(link => {
            // Use the helper to resolve handler IDs to node IDs
            const sourceNodeId = this._getNodeIdFromHandlerId(link.sourceHandlerId);
            const targetNodeId = this._getNodeIdFromHandlerId(link.targetHandlerId);

            // Helper to add the link to the cache for a given node ID
            const addLinkToCache = (nodeId, link) => {
                if (nodeId) {
                    if (!this.cache.nodeLinks.has(nodeId)) {
                        this.cache.nodeLinks.set(nodeId, []);
                    }
                    // Only add if it's not already in the array (prevents duplication)
                    if (!this.cache.nodeLinks.get(nodeId).includes(link)) {
                        this.cache.nodeLinks.get(nodeId).push(link);
                    }
                }
            };

            addLinkToCache(sourceNodeId, link);
            addLinkToCache(targetNodeId, link);
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
        this.state = newState;
        this._rebuildCache(); 
        this.eventBus.emit('STATE_LOADED', this.state);
        this.eventBus.emit('HISTORY_CHANGED', { 
            canUndo: this.history.canUndo(), 
            canRedo: this.history.canRedo() 
        });
    }
}