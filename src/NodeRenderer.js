import { registry } from './Registry.js';
import { CONFIG, snapToGrid } from './config.js';
import { updateLinksOnly } from './render.js';
import { setupNodeContextMenu } from './ContextMenu.js';
import { eventBus } from './EventBus.js'; // Import Event Bus

const DIMENSIONS = {
    label_margin: 20,
    sublabel_margin: 20
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
            const definition = registry.getNodeDefinition(d.type);
            let nodeWidth = 0;
            let nodeHeight = 0;

            if (definition && typeof definition.getDimensions === 'function') {
                const dims = definition.getDimensions(d); 
                nodeWidth = dims.width;
                nodeHeight = dims.height;
            } else {
                if (d.width) nodeWidth = d.width;
                if (d.height) nodeHeight = d.height;
            }
            let yOffset = nodeHeight + DIMENSIONS.label_margin;

            if (d.label) {
                const labelJoin = currentSelection.selectAll(".node-label").data([d]);
                labelJoin.enter()
                    .append("text")
                    .attr("class", "node-label")
                    .attr("text-anchor", "middle")
                    .merge(labelJoin)
                    .attr("x", nodeWidth / 2)
                    .attr("y", yOffset)
                    .text(d.label);
                labelJoin.exit().remove();
                yOffset += DIMENSIONS.sublabel_margin;
            }

            if (d.sublabel) {
                const sublabelJoin = currentSelection.selectAll(".node-sublabel").data([d]);
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
                    const handlerGroup = enter.append("g")
                        .attr("class", d => `handler-g ${d.type}`)
                        .attr("transform", d => `translate(${d.offset_x || 0}, ${d.offset_y || 0})`);
                    
                    handlerGroup.each(function(h) {
                        const handlerDef = registry.getHandlerDefinition(h.type);
                        if (handlerDef) handlerDef.render(d3.select(this)); 
                    });
                    return handlerGroup;
                },
                update => {
                    update.attr("transform", d => `translate(${d.offset_x || 0}, ${d.offset_y || 0})`);
                    update.each(function(d) {
                        d3.select(this).selectAll(".handler").datum(d);
                    });
                    return update;
                },
                exit => exit.remove()
            );
    }
    
    setupDrag(selection) {
        const dragBehavior = d3.drag()
            .on("start", function(event, d) {
                d3.select(this).raise().classed("dragging", true);
            })
            .on("drag", function(event, d) {
                d.x = event.x;
                d.y = event.y;
                
                // Update visual position immediately
                d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
                
                // Update connections immediately
                updateLinksOnly();
                
                // Trigger helpers update via EventBus
                eventBus.emit('NODE_MOVED', d);
            })
            .on("end", function(event, d) {
                d3.select(this).classed("dragging", false);
                
                const snappedX = snapToGrid(d.x);
                const snappedY = snapToGrid(d.y);
                
                if (snappedX !== d.x || snappedY !== d.y) {
                    const startX = d.x;
                    const startY = d.y;
                    
                    d3.select(this).transition().duration(150).ease(d3.easeCubicOut)
                        .tween("snap-animation", function() {
                            const iX = d3.interpolateNumber(startX, snappedX);
                            const iY = d3.interpolateNumber(startY, snappedY);
                            return function(t) {
                                d.x = iX(t);
                                d.y = iY(t);
                                d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
                                updateLinksOnly();
                                eventBus.emit('NODE_MOVED', d);
                            };
                        })
                        .on("end", () => {
                            d.x = snappedX;
                            d.y = snappedY;
                            updateLinksOnly();
                            eventBus.emit('NODE_MOVED', d);
                        });
                } else {
                    updateLinksOnly();
                    eventBus.emit('NODE_MOVED', d);
                }
            });
        
        selection.call(dragBehavior);
    }
    
    render(selection) {
        this.renderBody(selection);
        this.renderLabels(selection);
        this.renderHandlers(selection);
        this.setupDrag(selection);
        setupNodeContextMenu(selection);
    }
    
    update(selection) {
        this.renderHandlers(selection);
    }
}