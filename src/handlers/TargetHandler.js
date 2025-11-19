// handlers/TargetHandler.js
import { HandlerDefinition } from './HandlerDefinition.js';
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { render } from '../render.js';

const DIMENSIONS = {
    width: CONFIG.handler.width,
    height: CONFIG.handler.height
}

export class TargetHandlerDefinition extends HandlerDefinition {
    constructor() {
        super();
        this.name = 'basic_target';
        this.type = 'target';
    }

    static getDimension() {
        return DIMENSIONS;
    }
    
    render(selection) {
        const w = DIMENSIONS.width;
        const h = DIMENSIONS.height;
        
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
                
                // Verifica se handler è già connesso
                const existingLink = state.links.find(l => l.target === d.id);
                
                if (existingLink) {
                    // Disconnetti link esistente
                    state.links = state.links.filter(l => l.id !== existingLink.id);
                    state.ui.disconnectingLink = existingLink;
                    
                    const viewport = d3.select("g.viewport").node();
                    const [mouseX, mouseY] = d3.pointer(event.sourceEvent, viewport);
                    
                    state.ui.ghostLink = {
                        sourceId: existingLink.source,
                        targetX: mouseX,
                        targetY: mouseY
                    };
                    render();
                } else {
                    // Permetti di iniziare nuova connessione da target vuoto
                    const viewport = d3.select("g.viewport").node();
                    const [mouseX, mouseY] = d3.pointer(event.sourceEvent, viewport);
                    
                    state.ui.ghostLink = {
                        sourceId: d.id,
                        targetX: mouseX,
                        targetY: mouseY,
                        reversed: true // Flag per sapere che parte da target
                    };
                    render();
                }
            })
            .on("drag", (event) => {
                if (state.ui.disconnectingLink || state.ui.ghostLink) {
                    const viewport = d3.select("g.viewport").node();
                    const [mouseX, mouseY] = d3.pointer(event.sourceEvent, viewport);
                    state.ui.ghostLink.targetX = mouseX;
                    state.ui.ghostLink.targetY = mouseY;
                    render();
                }
            })
            .on("end", (event) => {
                if (state.ui.disconnectingLink || state.ui.ghostLink) {
                    const oldLink = state.ui.disconnectingLink;
                    const targetElement = event.sourceEvent.target;
                    const targetData = d3.select(targetElement).datum();
                    
                    if (targetData) {
                        // Determina source e target in base a reversed flag
                        if (state.ui.ghostLink.reversed) {
                            // Partito da target, deve finire su source
                            if (targetData.type === 'source') {
                                state.links.push({
                                    id: `link_${Date.now()}`,
                                    source: targetData.id,
                                    target: state.ui.ghostLink.sourceId
                                });
                            }
                        } else {
                            // Normale: partito da source
                            if (targetData.type === 'target' && targetData.id !== oldLink?.target) {
                                state.links.push({
                                    id: `link_${Date.now()}`,
                                    source: oldLink?.source || state.ui.ghostLink.sourceId,
                                    target: targetData.id
                                });
                            }
                        }
                    }
                    
                    state.ui.disconnectingLink = null;
                    state.ui.ghostLink = null;
                    render();
                }
            })
        );
    }
}