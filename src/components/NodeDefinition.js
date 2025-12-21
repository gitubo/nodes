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
        this.style = data?.style || { fontSize: 20 };
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
                style: this.style,
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
        // 1. Instantiate the node (this creates NEW handlers with NEW IDs)
        const instance = new this(
            nodeData.presentation?.position?.x || 0, 
            nodeData.presentation?.position?.y || 0,
            nodeData.label,
            nodeData.note,
            nodeData.data
        );
        instance.id = nodeData.id;

        if (nodeData.presentation?.style) {
            instance.style = nodeData.presentation?.style;
        }

        // 2. Restore Handler IDs by matching Role/Index
        if (nodeData.handles) {
            // Convert the hash map of saved handles to an array
            const savedHandlers = Object.values(nodeData.handles);
            
            const savedHandlersByType = savedHandlers.reduce((acc, h) => {
                if (!acc[h.type]) acc[h.type] = [];
                acc[h.type].push(h);
                return acc;
            }, {});

            // Iterate over the FRESH handlers created by the constructor
            instance.handlers.forEach(h => {
                const typeGroup = savedHandlersByType[h.type];
                
                // Match FIFO (First In, First Out) by Type
                if (typeGroup && typeGroup.length > 0) {
                    const match = typeGroup.shift(); 
                    
                    h.id = match.id; 
                    if (match.label !== undefined) h.label = match.label;
                    if (match.flow !== undefined) h.flow = match.flow;
                    
                    // Allow specific handler logic to restore extra data
                    const HandlerClass = registry.getHandlerDefinition(match.type);
                    if (HandlerClass && typeof HandlerClass.deserialize === 'function') {
                         const restoredExtra = HandlerClass.deserialize(match);
                         Object.assign(h, restoredExtra);
                         // Ensure ID is kept from the match, not the deserialized extra
                         h.id = match.id; 
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
    getShapeAttributes() { return null; }
    
    getShapeTemplate() { 
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const sR = CONFIG.node.smallBorderRadius;

        const d = `
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
        return `<path d="${d}" />`;
    }

    static get schema() {
        return null; 
        /* Example Return:
        {
            "maxRetries": { type: "number", label: "Max Retries", default: 3 },
            "role": { type: "select", label: "Role", options: ["admin", "user"] },
            "isActive": { type: "boolean", label: "Active" }
        }
        */
    }
        
    static renderProperties(container, nodeData, onChange) { }
}