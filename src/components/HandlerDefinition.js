import { CONFIG } from '../core/config.js';

const generateId = () => crypto.randomUUID();

export class HandlerDefinition {
    static get type() {
         throw new Error("Handler plugins must implement a static get type() method.");
    }

    constructor(x, y, label='', direction = 'right') {
        this.id = generateId();
        this.type = this.constructor.type;
        this.role = '';
        this.offset = {x: x, y: y};
        this.label = label;
        this.direction = direction;
        this.dimensions = { width: CONFIG.handler.width, height: CONFIG.handler.height };
    }


    static getDimension(obj) { return obj.dimensions || {}; }
    static getRole(obj) { return obj.role || ''; }
    static draw(obj){}

    getShapePath() {
        // Default: A circle path
        const r = CONFIG.handler.radius;
        // SVG Path for a circle: M cx,cy m -r,0 a r,r 0 1,0 (r*2),0 a r,r 0 1,0 -(r*2),0
        return `M 0,0 m -${r},0 a ${r},${r} 0 1,0 ${r*2},0 a ${r},${r} 0 1,0 -${r*2},0`;
    }

    renderExtras(group, state) {}

    renderLabel(group) {
        if (!this.label) return;

        // Clean up previous labels
        group.selectAll(".handler-label-group").remove();

        const labelGroup = group.append("g")
            .attr("class", "handler-label-group")
            .style("cursor", "move"); // or pointer

        // Default position: slightly to the right/top depending on direction logic
        // You can make this smarter based on this.direction
        const x = CONFIG.handler.radius + 8 + (this.labelOffsetX || 0);
        const y = (this.labelOffsetY || 0);

        labelGroup.attr("transform", `translate(${x}, ${y})`);
        
        labelGroup.append("text")
            .attr("class", "handler-label-text")
            .text(this.label)
            .attr("dy", "0.3em")
            .attr("text-anchor", "start");
    }

    static serialize(handler) {
        return {
            [handler.id] : {
                type: handler.type, 
                label: handler.label,
                presentation: {
                    offset: {
                        x: handler.offset.x, 
                        y: handler.offset.y
                    },
                    direction: handler.direction
                }
            }
        };
    }

    static deserialize(data, id) {
        const offset_x = data.presentation?.offset?.x || 0;
        const offset_y = data.presentation?.offset?.y || 0;
        const label = data.label || '';
        const direction = data.presentation?.direction || 'right';
        const instance = new this(offset_x, offset_y, label, direction);

        instance.id = id;
//        instance.type = data.type; 
        return instance;
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