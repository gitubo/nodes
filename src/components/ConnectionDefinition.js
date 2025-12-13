import { calculatePath } from '../render/geometry.js';

export class ConnectionDefinition {
    static get type() { return 'default'; }

    constructor(data = {}) {
        this.id = data.id || crypto.randomUUID();
        this.type = this.constructor.type;
        this.sourceHandlerId = data.sourceHandlerId;
        this.targetHandlerId = data.targetHandlerId;
        
        // Extended Style Object
        this.style = {
            stroke: data.style?.stroke || 'var(--dim-gray)',
            strokeWidth: data.style?.strokeWidth || 2,
            fontSize: data.style?.fontSize || 12,    // New
            fontColor: data.style?.fontColor || '#000000' // New
        };
        
        this.label = data.label || { text: '', offset: 0.5 };
        this.data = data.data || {};
    }

    /**
     * Returns the SVG path string. 
     * We pass the store/registry to reuse existing geometry logic.
     */
    getPath(nodes, registry) {
        // Reuse the existing robust Bezier logic from geometry.js
        // We pass 'this' as the link object expected by calculatePath
        return calculatePath(this, nodes, registry);
    }

    serialize() {
        return {
            id: this.id,
            type: this.type,
            sourceHandlerId: this.sourceHandlerId,
            targetHandlerId: this.targetHandlerId,
            label: this.label,
            style: this.style,
            data: this.data
        };
    }
}