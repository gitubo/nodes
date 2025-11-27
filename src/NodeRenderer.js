// src/NodeRenderer.js
import { registry } from './Registry.js';
import { updateLinksOnly } from './render.js';
import { setupNodeContextMenu } from './ContextMenu.js';
import { eventBus } from './EventBus.js';
import { snapToGrid } from './config.js';

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
            definition.render(currentSelection, d);
        });
    }

    renderHandlers(selection) {
        selection.selectAll("g.handler-g")
            .data(d => {
                const definition = registry.getNodeDefinition(d.type);
                return definition ? definition.getHandlers(d) : [];
            }, h => h.id)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", h => `handler-g ${h.type}`)
                        .attr("transform", h => `translate(${h.offset.x || 0}, ${h.offset.y || 0})`); 

                    g.each(function (h) {
                        const HandlerClass = registry.getHandlerDefinition(h.type);
                        const instance = new HandlerClass();
                        h.instance = instance;        
                        instance.render(d3.select(this));
                    });
                    return g;
                },
                update => {
                    update.attr("transform", h => `translate(${h.offset.x || 0}, ${h.offset.y || 0})`); 
                    update.each(function (h) {
                        if (h.instance) {
                            h.instance.render(d3.select(this));
                        }
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
                initialPos = { x: d.position.x, y: d.position.y };
            })
            .on("drag", function(event, d) {
                // Apply drag
                d.position.x = event.x;
                d.position.y = event.y;
                
                // 1. Update Node DOM (Fast)
                d3.select(this).attr("transform", `translate(${d.position.x}, ${d.position.y})`);
                
                // 2. Update Links (OPTIMIZED)
                // We pass the ID so the renderer only updates connections to THIS node.
                // We do NOT update the whole graph.
                updateLinksOnly(d.id); 
                
                // 3. Update AddNodeHelpers (Direct Sync)
                const helpers = d3.selectAll(`.add-node-helper[data-node-id='${d.id}']`);
                helpers.attr("transform", function() {
                    const hData = d3.select(this).datum();
                    if (!hData) return "";
                    return `translate(${d.position.x + hData.relX}, ${d.position.y + hData.relY})`;
                });
            })
            .on("end", function(event, d) {
                d3.select(this).classed("dragging", false);
                const snappedX = snapToGrid(d.position.x);
                const snappedY = snapToGrid(d.position.y);
                
                // Only trigger update if position actually changed
                if(snappedX !== initialPos.x || snappedY !== initialPos.y) {
                    d.position.x = snappedX; 
                    d.position.y = snappedY;
                    d3.select(this).attr("transform", `translate(${d.position.x}, ${d.position.y})`);
                    
                    // Final update of links
                    updateLinksOnly(d.id);
                    
                    eventBus.emit('NODE_MOVED', {
                        id: d.id,
                        initialPosition: initialPos,
                        finalPosition: { x: d.position.x, y: d.position.y }
                    });
                }
            });
        
        selection.call(dragBehavior);
    }
    
    render(selection) {
        this.renderBody(selection);
        this.renderHandlers(selection);
        this.setupDrag(selection);
        setupNodeContextMenu(selection);
    }
    
    update(selection) {
        this.renderBody(selection);
        this.renderHandlers(selection);
    }
}