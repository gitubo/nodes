// src/NodeRenderer.js
//import { Registry } from './Registry.js';
//import { updateLinksOnly } from './render.js';
// import { setupNodeContextMenu } from './ContextMenu.js'; // REMOVED
//import { eventBus } from './EventBus.js';
import { CONFIG } from './config.js'; // Import CONFIG
// import { startInlineEditing } from './InlineEditor.js'; // REMOVED

export class NodeRenderer {
    constructor(renderCallback, registry) { // Added registry
        this.renderCallback = renderCallback;
        this.registry = registry;
    }
    
    /**
     * Renders the node body, icon, and labels.
     * Logic moved from NodeDefinition.static.render
     */
    renderBody(selection, d) {
        const renderer = this;
        selection.each(function() {
             const currentSelection = d3.select(this);
             const definition = renderer.registry.getNodeDefinition(d.type);
             if (!definition) return;
             
             const dimensions = d.getDimensions();
             
             // 1. Render Shape
             currentSelection.selectAll("path.node-body").data([d])
                .join("path")
                .attr("class", `node-body ${d.type}`)
                .attr("d", d.getShapePath())
                .lower();

             // 2. Render Icon
             const icon = d.getIconPath();
             currentSelection.selectAll("path.node-icon").remove();
             if(icon && icon !== ''){
                const size = CONFIG.node.iconSize;
                const path = currentSelection.append("path")
                    .attr("class", "node-icon")
                    .attr("d", icon);
    
                const bbox = path.node().getBBox();
                const scale = size / Math.max(bbox.width, bbox.height);
                const tx = (dimensions.width - bbox.width * scale) / 2 - bbox.x * scale;
                const ty = (dimensions.height - bbox.height * scale) / 2 - bbox.y * scale;
                path.attr("transform", `translate(${tx}, ${ty}) scale(${scale})`);
             }

             // 3. Render Labels
             let yOffset = dimensions.height + CONFIG.node.labelTopMargin;
             
             if (d.label) {
                const capitalized = d.label.charAt(0).toUpperCase() + d.label.slice(1);
                const labelJoin = currentSelection.selectAll("text.node-label").data([d]);
                
                labelJoin.enter()
                    .append("text")
                    .attr("class", "node-label") 
                    .attr("text-anchor", "middle")
                    .merge(labelJoin)
                    .attr("x", dimensions.width / 2)
                    .attr("y", yOffset)
                    .text(capitalized);
                    // REMOVED: .on("dblclick", ...)
                    
                labelJoin.exit().remove();
                yOffset += CONFIG.node.noteTopMargin;
             } else {
                currentSelection.selectAll("text.node-label").remove();
             }
             
             if (d.note) {
                const noteJoin = currentSelection.selectAll("text.node-note").data([d]);
                noteJoin.enter()
                    .append("text")
                    .attr("class", "node-note") 
                    .attr("text-anchor", "middle")
                    .merge(noteJoin)
                    .attr("x", dimensions.width / 2)
                    .attr("y", yOffset)
                    .text(d.note);
                noteJoin.exit().remove();
             } else {
                currentSelection.selectAll("text.node-note").remove();
             }
        });
        //}.bind(this)); // Bind 'this' to access this.registry
    }

    renderHandlers(selection, d) {
        const renderer = this;
        selection.selectAll("g.handler-g")
            .data(() => {
                const definition = renderer.registry.getNodeDefinition(d.type);
                return definition ? definition.getHandlers(d) : [];
            }, h => h.id)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", h => `handler-g ${h.type} ${h.role}`)
                        .attr("data-id", h => h.id) // Add data-id for InputSystem
                        .attr("transform", h => `translate(${h.offset.x || 0}, ${h.offset.y || 0})`); 

                    g.each(function (h) {
                        const HandlerClass = renderer.registry.getHandlerDefinition(h.type);
                        if (!HandlerClass) return;
                        
                        // Handler logic is now data-driven, not class-driven
                        // The HandlerDefinition classes just contain render logic
                        
                        const instance = new HandlerClass();
                        h.instance = instance; 
                       
                        instance.render(d3.select(this));
                    });//}.bind(this)); // Bind 'this'
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

    // REMOVED: setupDrag(selection)
    
    render(selection, d) {
        this.renderBody(selection, d);
        this.renderHandlers(selection, d);
        // REMOVED: this.setupDrag(selection);
        // REMOVED: setupNodeContextMenu(selection);
    }
    
    update(selection, d) {
        this.renderBody(selection, d);
        this.renderHandlers(selection, d);
    }
}