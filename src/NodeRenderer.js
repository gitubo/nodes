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
            const icon = definition.getIconPath();
            currentSelection.selectAll("path.node-icon").remove();
            if(icon && icon !== ''){
                // Actual icon
                const path = currentSelection.append("path")
                    .attr("class", "node-icon")
                    .attr("d", icon);
                const bbox = path.node().getBBox();
                const size = CONFIG.node.iconSize-CONFIG.node.iconPadding*2;
                const scale = size / Math.max(bbox.width, bbox.height);
                path.attr("transform", `translate(${CONFIG.node.iconMargin+CONFIG.node.iconPadding}, ${CONFIG.node.iconMargin+CONFIG.node.iconPadding}) scale(${scale})`);

                // Icon line
                currentSelection.append("path")
                    .attr("class", "node-icon line")
                    .attr("d", "M16 0 48 0A16 16 90 0164 16L64 48A16 16 90 0148 64L16 64A16 16 90 010 48L0 16A16 16 90 0116 0Z")
                    .attr("transform", `translate(${CONFIG.node.iconMargin}, ${CONFIG.node.iconMargin})`);
            }

             // 3. Render Labels
             if (d.label) {
                const capitalized = d.label.charAt(0).toUpperCase() + d.label.slice(1);
                const labelJoin = currentSelection.selectAll("text.node-label").data([d]);
                
                const label = labelJoin.enter()
                    .append("text")
                    .attr("class", "node-label") 
                    .attr("text-anchor", "left")
                    .merge(labelJoin)
                    .text(capitalized);

                const bbox = label.node().getBBox();
                label.attr("transform", `translate(${CONFIG.node.iconMargin*2+CONFIG.node.iconSize}, ${CONFIG.node.iconMargin+CONFIG.node.iconSize/2})`);
                    
                labelJoin.exit().remove();
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
                    .attr("transform", `translate(${CONFIG.node.iconMargin*2+CONFIG.node.iconSize}, ${CONFIG.node.iconMargin+CONFIG.node.iconSize})`)
                    .text(d.note);
                    
                noteJoin.exit().remove();
             } else {
                currentSelection.selectAll("text.node-note").remove();
             }
        });
    }

    renderHandlers(selection, d) {
        const renderer = this;
        selection.selectAll("g.handler-g")
            .data(() => {
//                const definition = renderer.registry.getNodeDefinition(d.type);
//                return definition ? definition.getHandlers(d) : [];
                return d.getHandlers() || [];
            }, h => h.id)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", h => `handler-g ${h.type} ${h.role}`)
                        .attr("data-id", h => h.id) // Add data-id for InputSystem
                        .attr("transform", h => {
                                const tx = h.offset?.x || 0;
                                const ty = h.offset?.y || 0;
                                return `translate(${tx},${ty})`;
                            }); 

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
                    update.attr("transform", h => {
                            const tx = h.offset?.x || 0;
                            const ty = h.offset?.y || 0;
                            return `translate(${tx},${ty})`;
                        }); 
 
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