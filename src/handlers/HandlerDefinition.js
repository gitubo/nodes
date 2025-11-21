/**
 * Base HandlerDefinition class for all handler types
 */
export class HandlerDefinition {
    constructor() {
        this.type = 'base';
        this.hideLabel = true;
    }

    getDimension() {
        return {};
    }
    
    /**
     * Render the handler visual elements
     * @param {d3.Selection} selection - D3 selection to render into
     */
    render(selection) {
        // Override in subclasses
    }
    
    /**
     * Update handler position
     * @param {d3.Selection} selection - D3 selection of handler group
     * @param {Object} position - {x, y} coordinates
     */
    updatePosition(selection, position) {
        selection.attr("transform", `translate(${position.x}, ${position.y})`);
    }
    
    /**
     * Setup drag behavior for this handler type
     * @param {d3.Selection} selection - D3 selection to attach drag to
     * @param {Object} callbacks - {onStart, onDrag, onEnd}
     */
    setupDrag(selection, callbacks) {
        // Override in subclasses that support dragging
    }
}