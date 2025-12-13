import { CONFIG } from '../core/config.js';

export const NODE_ROLES = {
    DATA: 'Data',
    TOOLS: 'Tools',
    LOGIC: 'Logic',
    CORE: 'Core'
};

export class NodeDefinition {
    constructor(x, y, label, note, data) {
        this.id = crypto.randomUUID();
        this.type = this.constructor.type; 
        this.role = this.constructor.getRole();
        this.label = label;
        this.note = note;
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
        this.handlers = [];
        this.position = {x: x, y: y};
        this.data = data;
    }

    static get type() {
        throw new Error("Node plugins must implement a static get type() method.");
    }

    static getRole() { return NODE_ROLES.CORE; }

    getData() {
        return {
            id: this.id,
            type: this.type,
            label: this.label,
            note: this.note,
            data: this.data ? JSON.parse(JSON.stringify(this.data)) : {},
            presentation: {
                position: { ...this.position }
            },
            handles: this.handlers.reduce((acc, h) => {
                if (typeof h.getData === 'function') {
                    acc[h.id] = h.getData();
                } else {
                    console.warn(`Handler ${h.id} missing getData()`);
                }
                return acc;
            }, {})
        };
    }

    static deserialize(nodeData, registry) {
        const instance = new this(
            nodeData.presentation?.position?.x || 0, 
            nodeData.presentation?.position?.y || 0,
            nodeData.label,
            nodeData.note,
            nodeData.data
        );
        instance.id = nodeData.id;

        if (nodeData.handles) {
            instance.handlers.forEach(h => {
                const hData = nodeData.handles[h.id];
                if (hData) {
                    const HandlerClass = registry.getHandlerDefinition(hData.type);
                    if (HandlerClass && typeof HandlerClass.deserialize === 'function') {
                         const restoredHandler = HandlerClass.deserialize(hData);
                         Object.assign(h, restoredHandler);
                         h.id = hData.id; 
                    }
                }
            });
        }
        
        return instance;
    }

    static hasTargetHandlers() { return false; }

    getHandlers() { return this.handlers || []; }
    getDimensions() { return { width: this.width, height: this.height }; }
    static getIconPath() { return ''; }

    getShapePath() { 
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const sR = CONFIG.node.smallBorderRadius;

        return `
            M ${sR},0
            L ${W - sR},0
            A ${sR},${sR} 0 0 1 ${W},${sR}
            L ${W},${H - sR}
            A ${sR},${sR} 0 0 1 ${W},${H - sR}
            L ${W},${H - sR}
            A ${sR},${sR} 0 0 1 ${W - sR},${H}
            L ${sR},${H}
            A ${sR},${sR} 0 0 1 0,${H - sR}
            L 0,${sR}
            A ${sR},${sR} 0 0 1 ${sR},0
            Z
        `.replace(/\s+/g, ' ');
    }
        
    static renderProperties(container, nodeData, onChange) { }
}