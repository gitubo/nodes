import { CONFIG } from '../core/config.js';

const generateId = () => crypto.randomUUID();

export class HandlerDefinition {
    static get type() {
         throw new Error("Handler plugins must implement a static get type() method.");
    }

    constructor(x, y, label='', direction = 'right', flow = 'any') {
        this.id = generateId();
        this.type = this.constructor.type;
        this.flow = flow;
        this.offset = {x: x, y: y};
        this.label = label;
        this.direction = direction;
        this.dimensions = { width: CONFIG.handler.width, height: CONFIG.handler.height };
    }


    static getDimension(obj) { return obj.dimensions || {}; }
    static draw(obj){}

    getShapeAttributes() { return null; }

    getShapeTemplate() {
        const r = CONFIG.handler.radius;
        const d = `M 0,0 m -${r},0 a ${r},${r} 0 1,0 ${r*2},0 a ${r},${r} 0 1,0 -${r*2},0`;
        return `<path d="${d}" />`;
    }

    getData() {
        return {
            id: this.id,
            type: this.type,
            label: this.label,
            flow: this.flow,
            presentation: {
                offset: { ...this.offset },
                direction: this.direction
            }
        };
    }

    renderExtras(group, state) {}

    renderLabel(group) {
        if (!this.label) return;

        // Clean up previous labels
        group.selectAll(".handler-label-group").remove();

        const labelGroup = group.append("g")
            .attr("class", "handler-label-group")
            .style("cursor", "move");

        const margin = this.labelMargin || 12;
        const padding = 6;

        // --- FIX: Remove Hardcoded Defaults ---
        // Only use instance properties. If undefined, let CSS handle it.
        const customBorder = this.borderColor || null;
        const customBg = this.backgroundColor || null;
        const customFontColor = this.fontColor || null;
        const customFontSize = this.fontSize || '12px'

        // 1. Render Text first (to measure it)
        const textEl = labelGroup.append("text")
            .attr("class", "handler-label-text")
            .text(this.label)
            .attr("dominant-baseline", "middle")
            .attr("y", 1);

        // Apply custom text color if exists, else rely on CSS (.handler-label-text)
        if (customFontColor) textEl.style("fill", customFontColor);
        if (customFontSize) textEl.style("font-size", customFontSize);

        // 2. Calculate Position & Anchor
        let x = 0, y = 0, anchor = "start";
        const bbox = textEl.node().getBBox();
        const w = bbox.width + (padding * 2);
        const h = bbox.height + (padding * 2);

        switch(this.direction) {
            case 'left':
                anchor = "end";
                x = -margin;
                break;
            case 'top':
                anchor = "middle";
                y = -margin;
                break;
            case 'bottom':
                anchor = "middle";
                y = margin + (h/2);
                break;
            case 'top_right':
                anchor = "start";
                x = margin * 0.7;
                y = -margin * 0.7;
                break;
            case 'top_left':
                anchor = "end";
                x = -margin * 0.7;
                y = -margin * 0.7;
                break;
            case 'right':
            default:
                anchor = "start";
                x = margin;
                break;
        }

        textEl.attr("text-anchor", anchor);

        // 3. Correct Rect Position based on Anchor
        let rectX = 0;
        if (anchor === "start") rectX = -padding; // Shift left by padding
        else if (anchor === "middle") rectX = -w / 2;
        else if (anchor === "end") rectX = -w + padding; // Shift right by padding

        // 5. Insert Rect BEHIND text
        const rect = labelGroup.insert("rect", "text")
            .attr("x", rectX)
            .attr("y", -h / 2)
            .attr("width", w)
            .attr("height", h)
            .attr("rx", 8)
            .attr("class", "handler-label-bg")
            .attr("stroke-width", 1);

        if (customBorder) rect.attr("stroke", customBorder);
        if (customBg) rect.attr("fill", customBg);
        
        // 6. Move the whole group
        labelGroup.attr("transform", `translate(${x}, ${y})`);
    }

    static deserialize(data) {
        const offset = data.presentation?.offset || { x: 0, y: 0 };
        
        const instance = new this(
            offset.x, 
            offset.y, 
            data.label,
            data.presentation?.direction || 'right',
            data.flow || 'any'
        );
        
        instance.id = data.id;
        //instance.role = data.role;
        
        return instance;
    }

    render(selection) {}
    
    updatePosition(selection, position) {
        selection.attr("transform", `translate(${position.x}, ${position.y})`);
    }
    
    setupDrag(selection, callbacks) {}
}