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
        // 1. Instantiate the node (this creates NEW handlers with NEW IDs)
        const instance = new this(
            nodeData.presentation?.position?.x || 0, 
            nodeData.presentation?.position?.y || 0,
            nodeData.label,
            nodeData.note,
            nodeData.data
        );
        instance.id = nodeData.id;

        // 2. Restore Handler IDs by matching Role/Index
        if (nodeData.handles) {
            // Convert the hash map of saved handles to an array
            const savedHandlers = Object.values(nodeData.handles);
            
            // Group saved handlers by role for matching
            const savedHandlersByRole = savedHandlers.reduce((acc, h) => {
                if (!acc[h.role]) acc[h.role] = [];
                acc[h.role].push(h);
                return acc;
            }, {});

            // Iterate over the FRESH handlers created by the constructor
            instance.handlers.forEach(h => {
                const roleGroup = savedHandlersByRole[h.role];
                
                // If we have saved data for this role, pop the first one (FIFO)
                if (roleGroup && roleGroup.length > 0) {
                    const match = roleGroup.shift(); // Take first match
                    
                    // CRITICAL: Restore the ID so links can find this handler
                    h.id = match.id; 
                    
                    // Restore mutable properties
                    if (match.label !== undefined) h.label = match.label;
                    
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