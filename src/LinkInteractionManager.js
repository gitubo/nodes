// src/LinkInteractionManager.js
import { store } from './state.js';

class LinkInteractionManager {
    
    startDrag(sourceId, event, isReversed = false) {
        // FIX: Select viewport relative to the event target to ensure we get the correct SVG context
        const svg = event.target.closest('svg');
        if (!svg) return;
        
        const viewport = d3.select(svg).select("g.viewport").node();
        const [mouseX, mouseY] = d3.pointer(event, viewport);
        
        const ghostData = {
            sourceId: sourceId,
            targetX: mouseX,
            targetY: mouseY,
            reversed: isReversed
        };
        
        store.setGhostLink(ghostData);
        this.updateGhostVisual(ghostData, d3.select(svg));
    }

    updateDrag(event) {
        if (store.state.ui.ghostLink) {
            const svg = event.target.closest('svg');
            if (!svg) return;

            const viewport = d3.select(svg).select("g.viewport").node();
            const [mouseX, mouseY] = d3.pointer(event, viewport);
            
            store.state.ui.ghostLink.targetX = mouseX;
            store.state.ui.ghostLink.targetY = mouseY;
            
            this.updateGhostVisual(store.state.ui.ghostLink, d3.select(svg));
        }
    }

    endDrag(event, originId, isReversed = false) {
        const ghost = store.state.ui.ghostLink;
        const disconnecting = store.state.ui.disconnectingLink;

        if (ghost || disconnecting) {
            // Identify what we dropped ON
            // Note: d3.pointer returns coords, we need the element target
            // The event.sourceEvent.target is the DOM element
            const targetElement = event.sourceEvent.target;
            const targetData = d3.select(targetElement).datum();

            if (targetData) {
                // Logic: 
                // 1. Normal: Dragging from Source -> Dropped on Target
                // 2. Reversed: Dragging from Target (empty) -> Dropped on Source
                
                if (!isReversed && targetData.type === 'target') {
                     store.addLink(originId, targetData.id);
                } 
                else if (isReversed && targetData.type === 'source') {
                     store.addLink(targetData.id, originId);
                }
                // Reconnecting existing link
                else if (disconnecting && targetData.type === 'target') {
                     store.addLink(disconnecting.source, targetData.id);
                }
            }
        }

        store.setGhostLink(null);
        store.setDisconnectingLink(null);
    }
}

export const linkInteractionManager = new LinkInteractionManager();