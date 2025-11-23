// src/NodeRenderer.js
import { registry } from './Registry.js';
import { updateLinksOnly } from './render.js';
import { setupNodeContextMenu } from './ContextMenu.js';
import { eventBus } from './EventBus.js';
import { snapToGrid } from './config.js';
import { startInlineEditing } from './InlineEditor.js';

const DIMENSIONS = { label_margin: 20, sublabel_margin: 20 };

export class NodeRenderer {
    constructor(renderCallback) {
        this.renderCallback = renderCallback;
    }
    
    renderBody(selection) {
        selection.each(function(d) {
             const currentSelection = d3.select(this);
             const definition = registry.getNodeDefinition(d.type);
             if (!definition) return;
             
             // Remove existing body to prevent duplicates during updates
             currentSelection.selectAll("path.node-body").remove();
             
             currentSelection.append("path")
                 .attr("class", definition.getBodyClass())
                 .attr("d", definition.getShapePath())
                 // FIX: Lower the body to the bottom of the SVG group stack
                 // This ensures it renders BEHIND handlers and labels
                 .lower(); 
        });
    }

    renderLabels(selection) {
        selection.each(function(d) {
            const currentSelection = d3.select(this);
            const definition = registry.getNodeDefinition(d.type);
            let nodeWidth = d.width || 0;
            let nodeHeight = d.height || 0;

            if (definition && typeof definition.getDimensions === 'function') {
                 const dims = definition.getDimensions(d); 
                nodeWidth = dims.width;
                nodeHeight = dims.height;
            }
            
            let yOffset = nodeHeight + DIMENSIONS.label_margin;

            if (d.label) {
                const capitalized = d.label.charAt(0).toUpperCase() + d.label.slice(1);
                const labelJoin = currentSelection.selectAll("text.node-label").data([d]);
                const entered = labelJoin.enter()
                    .append("text")
                    .attr("class", "node-label") 
                    .attr("text-anchor", "middle");

                entered.merge(labelJoin)
                    .attr("x", nodeWidth / 2)
                    .attr("y", yOffset)
                    .text(capitalized)
                    .on("dblclick", (e, d) => {
                        e.stopPropagation();
                        startInlineEditing(e, d.label, (val) => {
                            d.label = val;
                            eventBus.emit('RENDER_REQUESTED');
                        });
                    });
                labelJoin.exit().remove();
                yOffset += DIMENSIONS.sublabel_margin;
            }
            
             if (d.sublabel) {
                const sublabelJoin = currentSelection.selectAll("text.node-sublabel").data([d]);
                sublabelJoin.enter()
                    .append("text")
                    .attr("class", "node-sublabel") 
                    .attr("text-anchor", "middle")
                    .merge(sublabelJoin)
                    .attr("x", nodeWidth / 2)
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
                    const g = enter.append("g").attr("class", d => `handler-g ${d.type}`)
                        .attr("transform", d => `translate(${d.offset_x||0}, ${d.offset_y||0})`);
                    g.each(function(h) {
                        const def = registry.getHandlerDefinition(h.type);
                        if(def) def.render(d3.select(this));
                    });
                    // FIX: Ensure handlers sit above the body
                    return g.raise();
                },
                update => {
                    update.attr("transform", d => `translate(${d.offset_x||0}, ${d.offset_y||0})`);
                    
                    update.each(function(h) {
                         const def = registry.getHandlerDefinition(h.type);
                         d3.select(this).selectAll("*").remove();
                         if(def) def.render(d3.select(this));
                    });
                    return update.raise();
                },
                exit => exit.remove()
            );
    }

    setupDrag(selection) {
        let initialPos = { x: 0, y: 0 };
        const dragBehavior = d3.drag()
            .on("start", function(event, d) {
                d3.select(this).raise().classed("dragging", true);
                initialPos = { x: d.x, y: d.y };
            })
            .on("drag", function(event, d) {
                d.x = event.x;
                d.y = event.y;
                d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
                
                updateLinksOnly(); 
                
                // FIX: Emit event during drag to update helpers in real-time
                eventBus.emit('NODE_DRAGGED', d);
            })
            .on("end", function(event, d) {
                d3.select(this).classed("dragging", false);
                
                const snappedX = snapToGrid(d.x);
                const snappedY = snapToGrid(d.y);
                
                d.x = snappedX; 
                d.y = snappedY;
                d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
                
                updateLinksOnly();
                
                eventBus.emit('NODE_MOVED', {
                    node: d,
                    initialPosition: initialPos,
                    finalPosition: { x: d.x, y: d.y }
                });
            });
        
        selection.call(dragBehavior);
    }
    
    render(selection) {
        // FIX: Explicit Render Order: Body -> Labels -> Handlers
        this.renderBody(selection);     // Bottom layer (due to .lower())
        this.renderLabels(selection);   // Middle layer
        this.renderHandlers(selection); // Top layer (due to .raise() or append order)
        this.setupDrag(selection);
        setupNodeContextMenu(selection);
    }
    
    update(selection) {
        // FIX: Explicit Update Order
        this.renderBody(selection);
        this.renderLabels(selection);
        this.renderHandlers(selection);
    }
}