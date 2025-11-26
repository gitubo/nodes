// src/NodeRenderer.js
import { registry } from './Registry.js';
import { updateLinksOnly } from './render.js';
import { setupNodeContextMenu } from './ContextMenu.js';
import { eventBus } from './EventBus.js';
import { snapToGrid } from './config.js';
import { startInlineEditing } from './InlineEditor.js';

const DIMENSIONS = { label_margin: 20, note_margin: 20 };

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
/*
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
                            eventBus.emit('NODE_UPDATED', { id: d.id });
                        });
                    });
                labelJoin.exit().remove();
                yOffset += DIMENSIONS.note_margin;
            }
            
            if (d.note) {
                const noteJoin = currentSelection.selectAll("text.node-note").data([d]);
                noteJoin.enter()
                    .append("text")
                    .attr("class", "node-note") 
                    .attr("text-anchor", "middle")
                    .merge(noteJoin)
                    .attr("x", nodeWidth / 2)
                    .attr("y", yOffset)
                    .text(d.note);
                noteJoin.exit().remove();
            }
        });
    }
*/
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
                        // Initial Render
                        instance.render(d3.select(this));
                    });
                    return g;
                },
                update => {
                    // Just update position
                    update.attr("transform", h => `translate(${h.offset.x || 0}, ${h.offset.y || 0})`); 
                    
                    // Call render again - BUT the handler must handle updates now!
                    update.each(function (h) {
                        if (h.instance) {
                            // REMOVED: d3.select(this).selectAll("*").remove(); 
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
                d.position.x = event.x;
                d.position.y = event.y;
                
                // 1. Update Node Position
                d3.select(this).attr("transform", `translate(${d.position.x}, ${d.position.y})`);
                
                // 2. Update Links
                updateLinksOnly(); 
                
                // 3. Update AddNodeHelpers (Direct Sync)
                // Select all helpers associated with this node ID
                const helpers = d3.selectAll(`.add-node-helper[data-node-id='${d.id}']`);
    
                helpers.attr("transform", function() {
                    // Use d3.select(this).datum() to get the specific helper's data (relX/relY)
                    const hData = d3.select(this).datum();
                    if (!hData) return "";
                    // Calculate new global position: Node New Pos + Helper Relative Offset
                    return `translate(${d.position.x + hData.relX}, ${d.position.y + hData.relY})`;
                });
            })
            .on("end", function(event, d) {
                d3.select(this).classed("dragging", false);
                const snappedX = snapToGrid(d.position.x);
                const snappedY = snapToGrid(d.position.y);
                d.position.x = snappedX; 
                d.position.y = snappedY;
                d3.select(this).attr("transform", `translate(${d.position.x}, ${d.position.y})`);
                updateLinksOnly();
                
                eventBus.emit('NODE_MOVED', {
                    id: d.id,
                    initialPosition: initialPos,
                    finalPosition: { x: d.position.x, y: d.position.y }
                });
            });
        
        selection.call(dragBehavior);
    }
    
    render(selection) {
        this.renderBody(selection);
        //this.renderLabels(selection);
        this.renderHandlers(selection);
        this.setupDrag(selection);
        setupNodeContextMenu(selection);
    }
    
    update(selection) {
        this.renderBody(selection);
        //this.renderLabels(selection);
        this.renderHandlers(selection);
    }
}