import { store } from '../core/state.js';
import { updateLinksOnly } from '../render/render.js';
import { eventBus } from '../core/EventBus.js';

class LinkInteractionManager {
    constructor() {
        this.activeViewport = null; 
    }
    
    startDrag(sourceHandlerId, event, isReversed = false) {
        const domEvent = event.sourceEvent || event; 
        const svg = domEvent.target.closest('svg');
        if (!svg) return;
        
        this.activeViewport = d3.select(svg).select("g.viewport").node();
        
        const [mouseX, mouseY] = d3.pointer(domEvent, this.activeViewport);
        
        const ghostData = {
            sourceHandlerId: sourceHandlerId,
            targetX: mouseX,
            targetY: mouseY,
            reversed: isReversed
        };
        
        store.setGhostLink(ghostData);
    }

    updateDrag(event) {
        // Use cached viewport to ensure consistent coordinate space
        if (store.state.ui.ghostLink && this.activeViewport) {
            const domEvent = event.sourceEvent || event;
            const [mouseX, mouseY] = d3.pointer(domEvent, this.activeViewport);
            
            const newGhostData = {
                ...store.state.ui.ghostLink,
                targetX: mouseX,
                targetY: mouseY
            };
            // Call the setter to emit 'GHOST_CONNECTION_UPDATED'
            store.setGhostLink(newGhostData); 
            eventBus.emit('GHOST_CONNECTION_UPDATED', null);
        }
    }


    endDrag(event, originId, isReversed = false) {
        // Recupera lo stato attuale del ghostLink
        const ghost = store.ui.ghostLink;
        const disconnecting = store.ui.disconnectingLink;
        store.setGhostLink(null);
        store.setDisconnectingLink(null);

        if (ghost || disconnecting) {
            const targetElement = event.sourceEvent.target;
            const targetData = d3.select(targetElement).datum();

            if (targetData) {
                 if (!isReversed && targetData.role === 'target') {
                     store.addLink(originId, targetData.id);
                 }
                 else if (isReversed && targetData.role === 'source') {
                     store.addLink(targetData.id, originId);
                 }
                 else if (disconnecting && targetData.role === 'target') {
                     store.addLink(disconnecting.sourceHandlerId, targetData.id);
                 }
            }
        }

        eventBus.emit('STATE_UPDATED'); 
    }
}

export const linkInteractionManager = new LinkInteractionManager();