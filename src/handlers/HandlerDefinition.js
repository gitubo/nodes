import { CONFIG } from '../config.js';

const generateId = () => crypto.randomUUID();

export class HandlerDefinition {
    constructor(x, y, label='', direction = 'right') {
        this.id = generateId();
        this.type = 'base';
        this.role = '';
        this.offset = {x: x, y: y};
        this.label = label;
        this.direction = direction;
        this.dimensions = { width: CONFIG.handler.width, height: CONFIG.handler.height };
    }

    static getDimension(obj) { return obj.dimensions || {}; }
    static getRole(obj) { return obj.role || ''; }
    static draw(obj){}
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