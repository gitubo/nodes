// handlers/SourceHandler.js
import { HandlerDefinition } from './HandlerDefinition.js';
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { render } from '../render.js';

const DIMENSIONS = {
    radius: CONFIG.handler.radius
}

export class SourceHandlerDefinition extends HandlerDefinition {
    constructor() {
        super();
        this.name = 'basic_source';
        this.type = 'source';
    }

    static getDimension() {
        return DIMENSIONS;
    }
    
    render(selection) {
        const radius = DIMENSIONS.radius;
            
        selection.append("circle")
            .attr("class", "handler source")
            .attr("x", radius/2)
            .attr("y", radius/2)
            .attr("r", radius);
        
        this.setupDrag(selection);
    }
    
    setupDrag(selection) {
        selection.call(d3.drag()
            .on("start", (event, d) => {
                event.sourceEvent.stopPropagation();
                const viewport = d3.select("g.viewport").node();
                const [mouseX, mouseY] = d3.pointer(event.sourceEvent, viewport);
                
                state.ui.ghostLink = {
                    sourceId: d.id,
                    targetX: mouseX,
                    targetY: mouseY
                };
                render();
            })
            .on("drag", (event) => {
                const viewport = d3.select("g.viewport").node();
                const [mouseX, mouseY] = d3.pointer(event.sourceEvent, viewport);
                
                if (state.ui.ghostLink) {
                    state.ui.ghostLink.targetX = mouseX;
                    state.ui.ghostLink.targetY = mouseY;
                }
                render();
            })
            .on("end", (event, d) => {
                const targetElement = event.sourceEvent.target;
                const targetData = d3.select(targetElement).datum();
                
                if (targetData && targetData.type === 'target') {
                    state.links.push({
                        id: `link_${Date.now()}`,
                        source: state.ui.ghostLink.sourceId,
                        target: targetData.id
                    });
                }
                
                state.ui.ghostLink = null;
                render();
            })
        );
    }
}