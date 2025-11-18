// handlers/SourceHandler.js
import { HandlerDefinition } from './HandlerDefinition.js';
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { render } from '../render.js';

export class SourceHandlerDefinition extends HandlerDefinition {
    constructor() {
        super();
        this.type = 'source';
    }
    
    calculatePosition(handler) {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const hw = CONFIG.handler.source.width;
        const hh = CONFIG.handler.source.height;
        const offset = CONFIG.handler.source.connectorOffset;
        const bottomOffset = CONFIG.handler.source.bottomOffset;
        
        const rectX = W - hw + offset;
        const rectY = H - bottomOffset;
        const connectorX = rectX + hw;
        const connectorY = rectY + (hh / 2);
        
        return { x: connectorX, y: connectorY };
    }
    
    render(selection) {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const hw = CONFIG.handler.source.width;
        const hh = CONFIG.handler.source.height;
        const offset = CONFIG.handler.source.connectorOffset;
        const bottomOffset = CONFIG.handler.source.bottomOffset;
        const radius = CONFIG.handler.source.connectorRadius;
        
        const rectX = W - hw + offset;
        const rectY = H - bottomOffset;
        
        selection.append("rect")
            .attr("class", "handler-body source")
            .attr("x", rectX)
            .attr("y", rectY)
            .attr("width", hw)
            .attr("height", hh)
            .attr("rx", 3)
            .attr("ry", 3);
        
        selection.append("circle")
            .attr("class", "handler-connector source")
            .attr("cx", W + offset)
            .attr("cy", rectY + (hh / 2))
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