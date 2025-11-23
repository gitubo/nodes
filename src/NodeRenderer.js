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
             currentSelection.selectAll("path.node-body").remove();
             currentSelection.append("path")
                 .attr("class", definition.getBodyClass())
                 .attr("d", definition.getShapePath());
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

                // REQUESTED: Inline editing for Node Label
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
            // ... sublabel rendering (similar) ...
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
                    return g;
                },
                update => {
                    update.attr("transform", d => `translate(${d.offset_x||0}, ${d.offset_y||0})`);
                    // Re-render internal handler content to ensure labels update if changed
                    update.each(function(h) {
                         const def = registry.getHandlerDefinition(h.type);
                         // Clear old content to prevent duplicates if render is additive
                         d3.select(this).selectAll("*").remove();
                         if(def) def.render(d3.select(this));
                    });
                    return update;
                },
                exit => exit.remove()
            );
    }

    setupDrag(selection) {
        let initialPos = { x: 0, y: 0 };

        const dragBehavior = d3.drag()
            .on("start", function(event, d) {
                d3.select(this).raise().classed("dragging", true);
                // Capture initial position
                initialPos = { x: d.x, y: d.y };
            })
            .on("drag", function(event, d) {
                d.x = event.x;
                d.y = event.y;
                d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
                // Visual update only, no logical event yet
                updateLinksOnly(); 
            })
            .on("end", function(event, d) {
                d3.select(this).classed("dragging", false);
                
                const snappedX = snapToGrid(d.x);
                const snappedY = snapToGrid(d.y);
                
                // REQUESTED: Remove transition to fix "lag" with helpers.
                // Immediate update provides snappier feel.
                d.x = snappedX; 
                d.y = snappedY;
                d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
                
                updateLinksOnly();
                
                // REQUESTED: Event only on drop, with initial and final pos
                eventBus.emit('NODE_MOVED', {
                    node: d,
                    initialPosition: initialPos,
                    finalPosition: { x: d.x, y: d.y }
                });
            });
        
        selection.call(dragBehavior);
    }
    
    render(selection) {
        this.renderBody(selection);
        this.renderHandlers(selection);
        this.renderLabels(selection);
        this.setupDrag(selection);
        setupNodeContextMenu(selection);
    }
    
    update(selection) {
        this.renderBody(selection);
        this.renderHandlers(selection);
        this.renderLabels(selection);
    }
}