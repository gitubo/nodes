// src/LinkInteractionManager.js
import { store } from './state.js';

class LinkInteractionManager {
    
    startDrag(sourceId, event, isReversed = false) {
        const viewport = d3.select("g.viewport").node();
        const [mouseX, mouseY] = d3.pointer(event, viewport);
        
        store.setGhostLink({
            sourceId: sourceId,
            targetX: mouseX,
            targetY: mouseY,
            reversed: isReversed
        });
    }

    updateDrag(event) {
        if (store.state.ui.ghostLink) {
            const viewport = d3.select("g.viewport").node();
            const [mouseX, mouseY] = d3.pointer(event, viewport);
            
            // Update directly for performance, then trigger render
            store.state.ui.ghostLink.targetX = mouseX;
            store.state.ui.ghostLink.targetY = mouseY;
            store.setGhostLink(store.state.ui.ghostLink);
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