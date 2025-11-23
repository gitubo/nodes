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
    getShapePath() { return ''; } 

    serialize(node) {
        return {
            id: node.id,
            type: node.type,
            position: { x: node.x, y: node.y },
            label: node.label,
            // CONSTRAINT 3
            note: node.note, 
            // CONSTRAINT 4
            custom_params: node.custom_params || {}, 
            handlers: node.handlers.map(h => ({
                id: h.id, 
                type: h.type, 
                label: h.label,
                offset: { x: h.offset_x, y: h.offset_y },
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
            x: data.position?.x || 0,
            y: data.position?.y || 0,
            label: data.label,
            // CONSTRAINT 3
            note: data.note,
            // CONSTRAINT 4
            custom_params: data.custom_params || {},
            handlers: (data.handlers || []).map(h => ({
                ...h,
                offset_x: h.offset?.x || 0,
                offset_y: h.offset?.y || 0
            })) || this.getHandlers()
        };
    }

    renderProperties(container, nodeData, onChange) {
    }
}