// src/state.js
import { snapToGrid } from './config.js';
import { HistoryManager } from './HistoryManager.js';

const generateId = () => crypto.randomUUID();

export class Store {
    constructor(eventBus, serializationService, registry) {
        this.eventBus = eventBus;
        this.serializationService = serializationService;
        this.registry = registry;

        this.state = {
            nodes: [],
            links: [],
            transform: d3.zoomIdentity,
            ui: {
                ghostLink: null,
                disconnectingLink: null, 
                selectedObject: null 
            },
            cache: {
                nodeLinks: new Map() 
            }
        };

        this.lastHistoryStatus = { canUndo: false, canRedo: false };

        this.history = new HistoryManager(
            30,
            (state) => this.serializationService.serialize(state),
            (data) => this.serializationService.deserialize(data)
        );
        this._saveHistory(); 
    }

    get nodes() { return this.state.nodes; }
    get links() { return this.state.links; }
    get ui() { return this.state.ui; }
    get transform() { return this.state.transform; }
    set transform(val) { this.state.transform = val; }

    getNode(id) { return this.state.nodes.find(n => n.id === id); }
    getLink(id) { return this.state.links.find(l => l.id === id); } 

    getLinksForNode(nodeId) {
        return Array.from(this.state.cache.nodeLinks.get(nodeId) || []);
    }

    _rebuildCache() {
        this.state.cache.nodeLinks.clear();
        this.state.links.forEach(link => {
            const { source, target } = link;
            if (!this.state.cache.nodeLinks.has(source)) {
                this.state.cache.nodeLinks.set(source, new Set());
            }
            if (!this.state.cache.nodeLinks.has(target)) {
                this.state.cache.nodeLinks.set(target, new Set());
            }
            this.state.cache.nodeLinks.get(source).add(link);
            this.state.cache.nodeLinks.get(target).add(link);
        });
    }

    _emitHistoryStatus() {
        const status = {
            canUndo: this.history.canUndo(),
            canRedo: this.history.canRedo()
        };

        // MODIFIED: Only emit if the state actually changed
        if (status.canUndo !== this.lastHistoryStatus.canUndo || 
            status.canRedo !== this.lastHistoryStatus.canRedo) {
            
            this.lastHistoryStatus = status;
            this.eventBus.emit('HISTORY_CHANGED', status);
        }
    }

    _saveHistory() {
        this.history.save(this.state); 
        this._emitHistoryStatus();
    }

    // --- MUTATORS ---

    addNode(type, x, y, label='', note='', data = {}) {
        this._saveHistory();
        const definition = this.registry.getNodeDefinition(type);
        if (!definition) {
            console.error(`Node type ${type} not registered.`);
            return null;
        }

        const node = new definition(snapToGrid(x), snapToGrid(y), label, note, data);
        this.state.nodes.push(node);
        this.eventBus.emit('NODE_CREATED', node);
        this.eventBus.emit('STATE_UPDATED');
        return node;
    }

    removeNode(nodeId) {
        this._saveHistory();
        this.state.links = this.state.links.filter(link => 
            link.source !== nodeId && link.target !== nodeId
        );
        this.state.nodes = this.state.nodes.filter(n => n.id !== nodeId);

        this._rebuildCache();
        this.eventBus.emit('NODE_REMOVED', nodeId);
        this.eventBus.emit('STATE_UPDATED');
    }

    addLink(sourceHandlerId, targetHandlerId, saveHistory = true) {
        if (!sourceHandlerId || !targetHandlerId) {
             console.error("Cannot add link: Missing source or target IDs.", {sourceHandlerId, targetHandlerId});
             return null;
        }

        if (saveHistory) this._saveHistory(); 
        
        const sourceInfo = this._findNodeByHandlerId(sourceHandlerId);
        const targetInfo = this._findNodeByHandlerId(targetHandlerId);
        
        if (!sourceInfo || !targetInfo){
            console.error('Cannot add link: handler does not belong to any node', { sourceHandlerId, targetHandlerId});
            return null;
        }
        
        const id = generateId();
        const link = {
            id,
            source: sourceInfo.nodeId,
            target: targetInfo.nodeId,
            sourceHandlerId,
            targetHandlerId,
            label: ''
        };
        this.state.links.push(link);
        this._rebuildCache();
        this.eventBus.emit('CONNECTION_CREATED', link);
        this.eventBus.emit('STATE_UPDATED');
        return link;
    }

    removeLink(linkId, saveHistory = true) {
        // MODIFIED: Capture link details before removal for the event payload
        const linkToRemove = this.getLink(linkId);
        if (!linkToRemove) return;

        if (saveHistory) this._saveHistory();
        
        this.state.links = this.state.links.filter(l => l.id !== linkId);
        this._rebuildCache();

        // MODIFIED: Payload contains full connection info, not just ID
        this.eventBus.emit('CONNECTION_REMOVED', {
            id: linkToRemove.id,
            source: linkToRemove.source,
            target: linkToRemove.target,
            sourceHandlerId: linkToRemove.sourceHandlerId,
            targetHandlerId: linkToRemove.targetHandlerId
        });

        this.eventBus.emit('STATE_UPDATED');
    }

    moveNode(nodeId, newX, newY) {
        const node = this.getNode(nodeId);
        if (node) {
            node.position.x = newX;
            node.position.y = newY;
            this.eventBus.emit('NODE_MOVED_HIGH_FREQ', node);
        }
    }

    updateNodePosition(nodeId, initialPos, finalPos) {
        const node = this.getNode(nodeId);
        if (node && (initialPos.x !== finalPos.x || initialPos.y !== finalPos.y)) {
            this._saveHistory();
            node.position.x = finalPos.x;
            node.position.y = finalPos.y;
            
            // MODIFIED: Simplified payload { id, previous, current }
            this.eventBus.emit('NODE_MOVED', {
                id: node.id,
                previous: initialPos,
                current: finalPos
            });

            this.eventBus.emit('STATE_UPDATED');
        } else if (node) {
            // Even if position didn't effectively change (e.g. snapped back), 
            // we emit to ensure drag state is cleared if listeners depend on it,
            // but we adhere to the new payload format.
            this.eventBus.emit('NODE_MOVED', {
                id: node.id,
                previous: initialPos,
                current: node.position
            });
        }
    }

    updateNode(id, changes) {
        const node = this.getNode(id);
        if (node) {
            this._saveHistory();
            Object.assign(node, changes);
            this.eventBus.emit('NODE_UPDATED', { id, changes });
            this.eventBus.emit('STATE_UPDATED');
        }
    }
    
    updateLink(id, changes) {
        const link = this.getLink(id);
        if(link) {
            this._saveHistory();
            Object.assign(link, changes);
            this.eventBus.emit('CONNECTION_UPDATED', { id, changes });
            this.eventBus.emit('STATE_UPDATED');
        }
    }
    
    selectObject(type, object) {
        this.state.ui.selectedObject = { type, id: object.id };
        this.eventBus.emit('SELECTION_CHANGED', this.state.ui.selectedObject);
    }
    
    deselect() {
        this.state.ui.selectedObject = null;
        this.eventBus.emit('SELECTION_CHANGED', null);
    }

    setGhostLink(ghostData) {
        this.state.ui.ghostLink = ghostData;
        this.eventBus.emit('GHOST_LINK_UPDATED', ghostData);
    }

    setDisconnectingLink(link) {
        this.state.ui.disconnectingLink = link;
    }

    _findNodeByHandlerId(handlerId) {
        for (const node of this.state.nodes) {
            const handler = node.getHandlers().find(h => h.id === handlerId);
            if (handler) return { nodeId: node.id, handler };
        }
        return null;
    }

    undo() {
        if (!this.history.canUndo()) return;
        const previousStateData = this.history.undo();
        if (previousStateData) {
            this.loadState(previousStateData);
            this.eventBus.emit('STATE_UPDATED');
            this._emitHistoryStatus();
        } else {
             console.warn("Undo: Failed or skipped corrupted history element.");
        }
    }
    
    redo() {
        if (!this.history.canRedo()) return;
        const nextStateData = this.history.redo();
        if (nextStateData) {
            this.loadState(nextStateData);
            this.eventBus.emit('STATE_UPDATED');
            this._emitHistoryStatus();
        } else {
             console.warn("Redo: Failed or skipped corrupted history element.");
        }
    }

    loadState({ nodes, links, viewport={} }) {
    
        this.state = {
            ...this.state,
            nodes: nodes,
            links: links
        };
    
        if(
            viewport !== null && 
            typeof viewport === 'object' &&
            typeof viewport.x === 'number' && isFinite(viewport.x) &&
            typeof viewport.y === 'number' && isFinite(viewport.y) &&
            typeof viewport.k === 'number' && isFinite(viewport.k) && viewport.k > 0
        ){
            const { x, y, k } = viewport;
            const newTransform = d3.zoomIdentity.translate(x, y).scale(k);
            this.state = {
                ...this.state,
                transform: newTransform,
            };
        }

        this._rebuildCache();
        this.eventBus.emit('STATE_LOADED', this.state); 
        this.deselect();
    }
    
    initializeWithDefaults() {
        const n1 = this.addNode('start', 128, 0);
        const n6 = this.addNode('end', 1504, 0);
    }
}