// src/LinkInteractionManager.js
import { store } from './state.js';
import { updateLinksOnly } from './render.js';

class LinkInteractionManager {
    constructor() {
        this.activeViewport = null; // Cache the viewport during drag
    }
    
    startDrag(sourceId, event, isReversed = false) {
        // Ensure we have a valid DOM event
        const domEvent = event.sourceEvent || event; 
        const svg = domEvent.target.closest('svg');
        if (!svg) return;
        
        // Cache the viewport node for the duration of the drag
        this.activeViewport = d3.select(svg).select("g.viewport").node();
        
        const [mouseX, mouseY] = d3.pointer(domEvent, this.activeViewport);
        
        const ghostData = {
            sourceId: sourceId,
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
            
            store.state.ui.ghostLink.targetX = mouseX;
            store.state.ui.ghostLink.targetY = mouseY;
            
            updateLinksOnly();
        }
    }

    endDrag(event, originId, isReversed = false) {
        const ghost = store.state.ui.ghostLink;
        const disconnecting = store.state.ui.disconnectingLink;

        if (ghost || disconnecting) {
            // Note: event here is the D3 drag event wrapper
            // event.sourceEvent.target gives the DOM element under cursor
            const targetElement = event.sourceEvent.target;
            
            // Check if we dropped on a valid target (must handle D3 selection data)
            const targetData = d3.select(targetElement).datum();

            if (targetData) {
                 if (!isReversed && targetData.role === 'target') {
                     store.addLink(originId, targetData.id);
                 } 
                 else if (isReversed && targetData.role === 'source') {
                     store.addLink(targetData.id, originId);
                 }
                 else if (disconnecting && targetData.role === 'target') {
                     store.addLink(disconnecting.source, targetData.id);
                 }
            }
        }

        store.setGhostLink(null);
        store.setDisconnectingLink(null);
        this.activeViewport = null; // Clear cache
    }
}

export const linkInteractionManager = new LinkInteractionManager();