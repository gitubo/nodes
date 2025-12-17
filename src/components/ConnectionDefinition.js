import { calculatePath, ConnectionPathType  } from '../render/geometry.js';

export class ConnectionDefinition {
    static get type() { return 'default'; }

    constructor(data = {}) {
        this.id = data.id || crypto.randomUUID();
        this.type = this.constructor.type;
        this.sourceHandlerId = data.sourceHandlerId;
        this.targetHandlerId = data.targetHandlerId;

        this.pathType = data.pathType || ConnectionPathType.SMOOTH_STEP;
        this.style = {
            stroke: data.style?.stroke || 'var(--dim-gray)',
            strokeWidth: data.style?.strokeWidth || 2
        };

        this.label = data.label || { text: '', offset: 0.5 };
        this.data = data.data || {};
    }

    getPath(nodes, registry, store) { return calculatePath(this, nodes, registry, store.cache);}

    update(data) {
        if (!data) return;
        if (data.label) {
            this.label = { 
                ...this.label, 
                ...data.label 
            };
        }
        if (data.style) {
            this.style = { 
                ...this.style, 
                ...data.style 
            };
        }
        if (data.data) {
            this.data = { 
                ...this.data, 
                ...data.data 
            };
        }

        if (data.sourceHandlerId) this.sourceHandlerId = data.sourceHandlerId;
        if (data.targetHandlerId) this.targetHandlerId = data.targetHandlerId;
    }

    getData() {
        return {
            id: this.id,
            type: this.type,
            sourceHandlerId: this.sourceHandlerId,
            targetHandlerId: this.targetHandlerId,
            pathType: this.pathType,
            label: this.label ? { ...this.label } : undefined,
            style: this.style ? { ...this.style } : undefined,
            data: this.data ? JSON.parse(JSON.stringify(this.data)) : {}
        };
    }

} 