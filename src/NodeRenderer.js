// NodeRenderer.js - GPU accelerated with requestAnimationFrame batching
import { registry } from './Registry.js';
import { CONFIG } from './config.js';
import { snapToGrid } from './config.js';
import { updateLinksOnly } from './render.js';
import { updateAddNodeHelpers } from './AddNodeHelper.js';

const DIMENSIONS = {
    label_margin: 20,
    sublabel_margin: 20
}

// Global RAF throttling
let rafId = null;
let pendingLinkUpdate = false;

function scheduleLinksUpdate() {
    if (pendingLinkUpdate) return;
    
    pendingLinkUpdate = true;
    
    if (rafId) cancelAnimationFrame(rafId);
    
    rafId = requestAnimationFrame(() => {
        updateLinksOnly();
        pendingLinkUpdate = false;
        rafId = null;
    });
}

export class NodeRenderer {
    constructor(renderCallback) {
        this.renderCallback = renderCallback;
    }
    
    renderBody(selection) {
        selection.each(function(d) {
            const currentSelection = d3.select(this);
            const definition = registry.getNodeDefinition(d.type);
            if (!definition) return;
            
            currentSelection.selectAll("path.node-body").remove();
            currentSelection.append("path")
                .attr("class", definition.getBodyClass())
                .attr("d", definition.getShapePath());
        });
    }
    
    renderLabels(selection) {
        selection.each(function(d) {
            const currentSelection = d3.select(this);
            const hasName = !!d.name;
            
            const W = d.width || CONFIG.node.width;
            const H = d.height || CONFIG.node.height;
                    
            let yOffset = H + DIMENSIONS.label_margin;

            if (d.label) {
                const labelJoin = currentSelection.selectAll(".node-label")
                    .data([d]);

                labelJoin.enter()
                    .append("text")
                    .attr("class", "node-label")
                    .attr("text-anchor", "middle")
                    .merge(labelJoin)
                    .attr("x", W / 2)
                    .attr("y", yOffset)
                    .text(d.label);

                labelJoin.exit().remove();
                yOffset += DIMENSIONS.sublabel_margin;
            }

            if (d.sublabel) {
                const sublabelJoin = currentSelection.selectAll(".node-sublabel")
                    .data([d]);

                sublabelJoin.enter()
                    .append("text")
                    .attr("class", "node-sublabel")
                    .attr("text-anchor", "middle")
                    .merge(sublabelJoin)
                    .attr("x", W / 2)
                    .attr("y", yOffset)
                    .text(d.sublabel);

                sublabelJoin.exit().remove();
            }
        });
    }
    
    renderHandlers(selection) {
        selection.selectAll("g.handler-g")
            .data(d => d.handlers, h => h.id)
            .join(
                enter => {
                    const handlerGroup = enter.append("g")
                        .attr("class", d => `handler-g ${d.type}`)
                        .attr("transform", d => `translate(${d.offset_x || 0}, ${d.offset_y || 0})`);
                    
                    handlerGroup.each(function(h) {
                        const handlerDef = registry.getHandlerDefinition(h.type);
                        if (handlerDef) {
                            handlerDef.render(d3.select(this)); 
                        }
                    });
                    
                    return handlerGroup;
                },
                update => {
                    update.attr("transform", d => `translate(${d.offset_x || 0}, ${d.offset_y || 0})`);
                    return update;
                },
                exit => exit.remove()
            );
    }
    
    setupDrag(selection) {
        const dragBehavior = d3.drag()
            .on("start", function(event, d) {
                d3.select(this).raise();
                d3.select(this).classed("dragging", true);
                
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                    pendingLinkUpdate = false;
                }
            })
            .on("drag", function(event, d) {
                d.x = event.x;
                d.y = event.y;
                
                d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
                
                scheduleLinksUpdate();
                
                // Aggiorna helper durante drag
                import('./AddNodeHelper.js').then(module => {
                    module.updateAddNodeHelpers();
                });
            })
            .on("end", function(event, d) {
                d3.select(this).classed("dragging", false);
                
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                    pendingLinkUpdate = false;
                }
                
                const snappedX = snapToGrid(d.x);
                const snappedY = snapToGrid(d.y);
                
                if (snappedX !== d.x || snappedY !== d.y) {
                    d.x = snappedX;
                    d.y = snappedY;
                    
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .ease(d3.easeCubicOut)
                        .attr("transform", `translate(${d.x}, ${d.y})`)
                        .on("end", () => {
                            updateLinksOnly();
                            // Aggiorna helper DOPO snap
                            import('./AddNodeHelper.js').then(module => {
                                module.updateAddNodeHelpers();
                            });
                        });
                } else {
                    updateLinksOnly();
                    // Aggiorna helper anche se già su griglia
                    import('./AddNodeHelper.js').then(module => {
                        module.updateAddNodeHelpers();
                    });
                }
            });
        
        selection.call(dragBehavior);
    }
    
    render(selection) {
        this.renderBody(selection);
        this.renderLabels(selection);
        this.renderHandlers(selection);
        this.setupDrag(selection);
        
        // Setup context menu - AGGIUNGI QUESTA PARTE
        import('./ContextMenu.js').then(module => {
            module.setupNodeContextMenu(selection);
        });
    }
    
    update(selection) {
        this.renderHandlers(selection);
    }
}