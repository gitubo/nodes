// NodeRenderer.js - Handles node rendering
import { registry } from './Registry.js';
import { CONFIG } from './config.js';
import { snapToGrid } from './config.js';

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
            
            const W = CONFIG.node.width;
            const H = CONFIG.node.height;
            
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
            
            const nameTextJoin = currentSelection.selectAll(".node-name-label")
                .data(hasName ? [d] : []);
            
            nameTextJoin.enter().append("text")
                .attr("class", "node-name-label")
                .attr("text-anchor", "middle")
                .merge(nameTextJoin)
                .attr("x", W/2)
                .attr("y", 5)
                .text(d => d.name);
            
            nameTextJoin.exit().remove();
            
            const titleTextJoin = currentSelection.selectAll(".node-title-label")
                .data((!hasName && internalLabelText) ? [d] : []);
            
            titleTextJoin.enter().append("text")
                .attr("class", "node-title-label")
                .attr("text-anchor", "middle")
                .merge(titleTextJoin)
                .attr("x", W/2)
                .attr("y", H/2 + 5)
                .text(() => internalLabelText);
            
            titleTextJoin.exit().remove();
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
                        .attr("class", d => `handler-g ${d.type}`);
                    
                    handlerGroup.each(function(h) {
                        const handlerDef = registry.getHandlerDefinition(h.type);
                        if (handlerDef) {
                            handlerDef.render(d3.select(this));
                        }
                    });
                    
                    return handlerGroup;
                },
                update => {
                    update.each(function(h) {
                        const handlerDef = registry.getHandlerDefinition(h.type);
                        if (handlerDef) {
                            const pos = handlerDef.calculatePosition(h);
                            handlerDef.updatePosition(d3.select(this), pos);
                        }
                    });
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