// NodeRenderer.js - Handles node rendering
import { registry } from './Registry.js';
import { CONFIG } from './config.js';
import { snapToGrid } from './config.js';


const DIMENSIONS = {
    label_margin: 20,
    sublabel_margin: 20
}

export class NodeRenderer {
    constructor(renderCallback) {
        this.renderCallback = renderCallback;
    }
    
    /**
     * Render node body (shape)
     * @param {d3.Selection} selection - Node group selection
     */
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
    
    /**
     * Render node labels
     * @param {d3.Selection} selection - Node group selection
     */
    renderLabels(selection) {
        selection.each(function(d) {
            const currentSelection = d3.select(this);
            const hasName = !!d.name;
            const internalLabelText = hasName ? '' : (d.label || '');
            
            const W = d.width || CONFIG.node.width;
            const H = d.height || CONFIG.node.height;
            
            const nameBgJoin = currentSelection.selectAll(".node-label-bg")
                .data(hasName ? [d] : []);
            
            nameBgJoin.enter().append("rect")
                .attr("class", "node-label-bg")
                .merge(nameBgJoin)
                .attr("x", W/2 - 50)
                .attr("y", -10)
                .attr("width", 100)
                .attr("height", 20)
                .attr("rx", 5);
            
            nameBgJoin.exit().remove();
            
            let yOffset = H + DIMENSIONS.label_margin;

            // ─── LABEL PRINCIPALE ───
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

                // Aggiorna yOffset per posizionare la sublabel sotto
                yOffset += DIMENSIONS.sublabel_margin;
            }

            // ─── SUBLABEL ───
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
    
    /**
     * Render node handlers
     * @param {d3.Selection} selection - Node group selection
     */
    renderHandlers(selection) {
        selection.selectAll("g.handler-g")
            .data(d => d.handlers, h => h.id)
            .join(
                enter => {
                    const handlerGroup = enter.append("g")
                        .attr("class", d => `handler-g ${d.type}`)
                        // Apply the initial offset transform directly
                        .attr("transform", d => `translate(${d.offset_x || 0}, ${d.offset_y || 0})`);
                    
                    handlerGroup.each(function(h) {
                        const handlerDef = registry.getHandlerDefinition(h.type);
                        if (handlerDef) {
                            // Handler just renders its visuals, no internal positioning
                            handlerDef.render(d3.select(this)); 
                        }
                    });
                    
                    return handlerGroup;
                },
                update => {
                    // Update the transform if offsets change (e.g., if node resized, though not implemented here)
                    update.attr("transform", d => `translate(${d.offset_x || 0}, ${d.offset_y || 0})`);
                    
                    // No need to call handlerDef.updatePosition if it only applies the transform
                    return update;
                },
                exit => exit.remove()
            );
    }
    
    /**
     * Setup drag behavior for nodes
     * @param {d3.Selection} selection - Node group selection
     */
    setupDrag(selection) {
        const dragBehavior = d3.drag()
            .on("drag", (event, d) => {
                d.x = snapToGrid(event.x);
                d.y = snapToGrid(event.y);
                d3.select(event.sourceEvent.target.closest('g.node'))
                    .attr("transform", `translate(${d.x}, ${d.y})`);
                this.renderCallback();
            });
        
        selection.call(dragBehavior);
    }
    
    /**
     * Render complete node
     * @param {d3.Selection} selection - Node group selection
     */
    render(selection) {
        this.renderBody(selection);
        this.renderLabels(selection);
        this.renderHandlers(selection);
        this.setupDrag(selection);
    }
    
    /**
     * Update existing node
     * @param {d3.Selection} selection - Node group selection
     */
    update(selection) {
        this.renderHandlers(selection);
    }
}