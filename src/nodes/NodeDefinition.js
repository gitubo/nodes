// src/nodes/NodeDefinition.js
import { CONFIG } from '../config.js';

export class NodeDefinition {
    constructor() {
        this.type = 'base';
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
        this.handlers = [];
    }

    getDimensions(d) { return { width: d.width, height: d.height }; }
    getHandlers() { return this.handlers; }
    getData() { return {}; }
    getBodyClass() { return `node-body ${this.type}`; }
    getShapePath() { return ''; } // (Abbreviated for brevity, same as original)

    // REQUESTED: x,y into 'position' object; offset_x, offset_y into 'offset' object
    serialize(node) {
        return {
            id: node.id,
            type: node.type,
            position: { x: node.x, y: node.y }, // Nested position
            label: node.label,
            sublabel: node.sublabel,
            customProperties: node.customProperties || [], // For KV pairs
            handlers: node.handlers.map(h => ({
                id: h.id, 
                type: h.type, 
                label: h.label,
                // Nested offset
                offset: { 
                    x: h.offset_x, 
                    y: h.offset_y 
                },
                hideLabel: h.hideLabel,
                labelOffsetX: h.labelOffsetX,
                labelOffsetY: h.labelOffsetY
            }))
        };
    }
    
    deserialize(data) {
        return {
            id: data.id,
            type: data.type,
            // Extract from nested position
            x: data.position?.x || 0,
            y: data.position?.y || 0,
            label: data.label,
            sublabel: data.sublabel,
            customProperties: data.customProperties || [],
            handlers: (data.handlers || []).map(h => ({
                ...h,
                // Flatten offset back for internal state usage
                offset_x: h.offset?.x || 0,
                offset_y: h.offset?.y || 0
            })) || this.getHandlers()
        };
    }

    renderProperties(container, nodeData, onChange) {
        // Base properties handled in UIController now for better Key-Value management
    }
}