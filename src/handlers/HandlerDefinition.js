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