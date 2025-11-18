// handlers/TargetHandler.js
import { HandlerDefinition } from './HandlerDefinition.js';
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { render } from '../render.js';

export class TargetHandlerDefinition extends HandlerDefinition {
    constructor() {
        super();
        this.type = 'target';
    }
    
    calculatePosition(handler) {
        const H = CONFIG.node.height;
        return { x: 0, y: H / 2 };
    }
    
    render(selection) {
        const w = CONFIG.handler.target.width;
        const h = CONFIG.handler.target.height;
        
        selection.append("rect")
            .attr("width", w)
            .attr("height", h)
            .attr("x", -w/2)
            .attr("y", -h/2)
            .attr("class", "handler target");
        
        this.setupDrag(selection);
    }
    
    setupDrag(selection) {
        selection.call(d3.drag()
            .on("start", (event, d) => {
                event.sourceEvent.stopPropagation();
                
                const link = state.links.find(l => l.target === d.id);
                if (link) {
                    state.links = state.links.filter(l => l.id !== link.id);
                    state.ui.disconnectingLink = link;
                    
                    const viewport = d3.select("g.viewport").node();
                    const [mouseX, mouseY] = d3.pointer(event.sourceEvent, viewport);
                    
                    state.ui.ghostLink = {
                        sourceId: link.source,
                        targetX: mouseX,
                        targetY: mouseY
                    };
                    render();
                }
            })
            .on("drag", (event) => {
                if (state.ui.disconnectingLink) {
                    const viewport = d3.select("g.viewport").node();
                    const [mouseX, mouseY] = d3.pointer(event.sourceEvent, viewport);
                    state.ui.ghostLink.targetX = mouseX;
                    state.ui.ghostLink.targetY = mouseY;
                    render();
                }
            })
            .on("end", (event) => {
                if (state.ui.disconnectingLink) {
                    const oldLink = state.ui.disconnectingLink;
                    const targetElement = event.sourceEvent.target;
                    const targetData = d3.select(targetElement).datum();
                    
                    if (targetData && targetData.type === 'target' && targetData.id !== oldLink.target) {
                        state.links.push({
                            id: `link_${Date.now()}`,
                            source: oldLink.source,
                            target: targetData.id
                        });
                    }
                    
                    state.ui.disconnectingLink = null;
                    state.ui.ghostLink = null;
                    render();
                }
            })
        );
    }
}