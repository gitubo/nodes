// src/NodeRenderer.js
import { CONFIG } from '../core/config.js';

export class NodeRenderer {
    constructor(renderCallback, registry, store) {
        this.renderCallback = renderCallback;
        this.registry = registry;
        this.store = store; 
    }
    
    renderBody(selection, d) {
        const renderer = this;
        selection.each(function() {
             const currentSelection = d3.select(this);
             const definition = renderer.registry.getNodeDefinition(d.type);
             if (!definition) return;
             
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
                const path = currentSelection.append("path")
                    .attr("class", "node-icon")
                    .attr("d", icon);
                const bbox = path.node().getBBox();
                const size = CONFIG.node.iconSize-CONFIG.node.iconPadding*2;
                const scale = size / Math.max(bbox.width, bbox.height);
                path.attr("transform", `translate(${CONFIG.node.iconMargin+CONFIG.node.iconPadding}, ${CONFIG.node.iconMargin+CONFIG.node.iconPadding}) scale(${scale})`);
                
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

        // 1. Join Data directly from the Node's handler instances
        selection.selectAll("g.handler-g")
            .data(d.getHandlers(), h => h.id)
            .join("g")
            .attr("class", h => `handler-g ${h.type} ${h.role}`)
            .attr("transform", h => `translate(${h.offset.x}, ${h.offset.y})`)
            .each(function(h) {
                const group = d3.select(this);

                // --- FIX: Render Main Body with Conditional Styling ---
                group.selectAll("path.handler-body")
                    .data([h]) 
                    .join("path")
                    .attr("class", "handler-body")
                    .attr("d", h.getShapePath())
                    // Only apply inline styles if the instance has specific overrides.
                    // Otherwise, passing null removes the attribute, allowing CSS to win.
                    .attr("fill", h.backgroundColor || null)
                    .attr("stroke", h.borderColor || null);

                // 2. Render Label (Delegates to the updated HandlerDefinition method above)
                if (typeof h.renderLabel === 'function') {
                    h.renderLabel(group);
                }

                // 3. Render Extras (Helper buttons)
                const isConnected = renderer.store.links.some(l => l.sourceHandlerId === h.id);
                if (typeof h.renderExtras === 'function') {
                    h.renderExtras(group, { 
                        isConnected, 
                        eventBus: renderer.store.eventBus 
                    });
                }
            });
    }

    render(selection, d) {
        this.renderBody(selection, d);
        this.renderHandlers(selection, d);
    }
    
    update(selection, d) {
        this.renderBody(selection, d);
        this.renderHandlers(selection, d);
    }
}