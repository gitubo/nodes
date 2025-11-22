import { HandlerDefinition } from './HandlerDefinition.js';
import { CONFIG } from '../config.js';
import { linkInteractionManager } from '../LinkInteractionManager.js';
import { store } from '../state.js';

const DIMENSIONS = { width: CONFIG.handler.width, height: CONFIG.handler.height };

export class TargetHandlerDefinition extends HandlerDefinition {
    constructor() {
        super();
        this.type = 'target';
    }

    static getDimension() { return DIMENSIONS; }
    
    render(selection) {
        const w = DIMENSIONS.width;
        const h = DIMENSIONS.height;
        
        selection.append("rect")
            .attr("width", w).attr("height", h)
            .attr("x", -w/2).attr("y", -h/2)
            .attr("class", "handler target");
        
        this.setupDrag(selection);
    }
    
    setupDrag(selection) {
        selection.call(d3.drag()
            .on("start", (event, d) => {
                event.sourceEvent.stopPropagation();
                
                // Check if already connected
                const existingLink = store.links.find(l => l.target === d.id);
                if (existingLink) {
                    store.removeLink(existingLink.id); // Remove immediately from state
                    store.setDisconnectingLink(existingLink);
                    // Start drag from the SOURCE of the removed link
                    linkInteractionManager.startDrag(existingLink.source, event.sourceEvent, false);
                } else {
                    // Start drag from this TARGET (reversed)
                    linkInteractionManager.startDrag(d.id, event.sourceEvent, true);
                }
            })
            .on("drag", (event) => {
                linkInteractionManager.updateDrag(event.sourceEvent);
            })
            .on("end", (event, d) => {
                // Origin ID depends on whether we were reconnecting or starting new
                const originId = store.state.ui.disconnectingLink ? store.state.ui.disconnectingLink.source : d.id;
                const isReversed = !store.state.ui.disconnectingLink; 
                linkInteractionManager.endDrag(event, originId, isReversed);
            })
        );
    }
}