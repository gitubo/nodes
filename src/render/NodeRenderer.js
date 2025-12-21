// src/NodeRenderer.js
import { CONFIG } from '../core/config.js';

function truncateText(textSelection, maxWidth) {
    textSelection.each(function() {
        const el = d3.select(this);
        const text = el.text();
        let chars = text.length;
        if (el.node().getComputedTextLength() <= maxWidth) return;
        
        // Simple binary reduction for performance
        while (el.node().getComputedTextLength() > maxWidth && chars > 0) {
            chars--;
            el.text(text.substring(0, chars) + "...");
        }
    });
}

export class NodeRenderer {
    constructor(renderCallback, registry, store) {
        this.renderCallback = renderCallback;
        this.registry = registry;
        this.store = store; 
    }

    _applyAttributes(selection, entity) {
        // 1. Retrieve dynamic overrides from logic
        let overrides = {};
        if (typeof entity.getShapeAttributes === 'function') {
            overrides = entity.getShapeAttributes() || {};
        }

        const styleProps = CONFIG.renderer.allowedStyleProps;

        // Apply as Inline Styles (Highest Specificity)
        styleProps.forEach(prop => {
            if (overrides[prop] !== undefined) {
                selection.style(prop, overrides[prop]);
            } else {
                // Important: clear inline style if undefined, so CSS class can take over
                selection.style(prop, null);
            }
        });

        // Apply any other attributes that are NOT visual styles as attributes
        Object.keys(overrides).forEach(key => {
            if (!styleProps.includes(key)) {
                selection.attr(key, overrides[key]);
            }
        });
    }

    renderBody(selection, d) {
        const renderer = this;
        selection.each(function() {
            const currentSelection = d3.select(this);
            const bodyJoin = currentSelection.selectAll("g.node-body-group").data([d]);

            bodyJoin.enter()
                .append("g")
                .attr("class", `node-body-group node-body ${d.type}`) 
                .merge(bodyJoin)
                .html(d.getShapeTemplate()) 
                .call(sel => renderer._applyAttributes(sel, d))
                .lower();
            bodyJoin.exit().remove();

            const definition = renderer.registry.getNodeDefinition(d.type);
            const iconPathData = definition.getIconPath();
            const hasIcon = (iconPathData && iconPathData !== '');
            
            // Calculate Content Width for Labels
            // If icon exists, text starts after icon. If not, text uses full width.
            const nodeWidth = d.width || CONFIG.node.width;
            const iconSize = CONFIG.node.iconSize;
            const margin = CONFIG.node.iconMargin;
            
            const textStartX = hasIcon ? (margin * 2 + iconSize) : (nodeWidth / 2);
            const textAnchor = hasIcon ? "start" : "middle";
            const maxTextWidth = hasIcon 
                ? (nodeWidth - textStartX - margin) // Remaining space
                : (nodeWidth - margin * 2);
            
            currentSelection.selectAll("path.node-icon").remove();
            if(hasIcon){
                const path = currentSelection.append("path")
                    .attr("class", "node-icon")
                    .attr("d", iconPathData);
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
                
                labelJoin.enter()
                    .append("text")
                    .attr("class", `node-label ${d.type}`) 
                    .merge(labelJoin)
                    .attr("text-anchor", textAnchor)
                    .attr("y", d.note ? margin + iconSize/2 - 6 : margin + iconSize/2 + 5) 
                    .attr("x", textStartX)
                    .text(capitalized)
                    // NUOVO: Applica font-size dallo stile del nodo
                    .style("font-size", d.style && d.style.fontSize ? `${d.style.fontSize}px` : null)
                    .call(sel => truncateText(sel, maxTextWidth));

                labelJoin.exit().remove();
             }
             
             // --- 4. Render Note with Truncation ---
             if (d.note) {
                const noteJoin = currentSelection.selectAll("text.node-note").data([d]);
                noteJoin.enter()
                    .append("text")
                    .attr("class", `node-note ${d.type}`) 
                    .merge(noteJoin)
                    .attr("text-anchor", textAnchor)
                    .attr("y", margin + iconSize/2 + 12)
                    .attr("x", textStartX)
                    .text(d.note)
                    .call(sel => truncateText(sel, maxTextWidth)); // <--- TRUNCATION

                noteJoin.exit().remove();
             }
        });
    }

    renderHandlers(selection, d) {
        const renderer = this;

        // 1. Join Data directly from the Node's handler instances
        selection.selectAll("g.handler-g")
            .data(d.getHandlers(), h => h.id)
            .join("g")
            .attr("class", "handler-g")
            .attr("transform", h => `translate(${h.offset.x}, ${h.offset.y})`)
            .each(function(h) {
                const group = d3.select(this);

                // 1. Create a container group for the handler visuals
                const bodyJoin = group.selectAll("g.handler-visuals").data([h]);

                bodyJoin.enter()
                    .append("g")
                    .attr("class", `handler-visuals handler-body ${h.type}`) // Keep 'handler-body' for CSS
                    .merge(bodyJoin)
                    // 2. Inject the template
                    .html(h.getShapeTemplate())
                    // 3. Apply attributes (colors, strokes defined in Definition)
                    .call(sel => renderer._applyAttributes(sel, h));
                
                bodyJoin.exit().remove();

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