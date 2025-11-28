// src/nodes/NodeDefinition.js
import { CONFIG } from '../config.js';
//import { eventBus } from '../EventBus.js'; // Note: Still used by renderProperties

const generateId = () => crypto.randomUUID();

export class NodeDefinition {
    constructor(x, y, label, note, data) {
        this.id = generateId();
        this.type = 'base';
        this.label = label;
        this.note = note;
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
        this.handlers = [];
        this.position = {x: x, y: y};
        this.data = data;
    }

    static getId(d) { return d.id; }
    static getHandlers(d) { return d.handlers || []; }
    static getData(d) { return d.data || {}; }

    getDimensions() { return { width: this.width, height: this.height }; }
    getIconPath() { return ''; }

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
        
    // REMOVED: static render(currentSelection, d)

    // REMOVED: serialize()
    
    // REMOVED: static deserialize(data)

    static renderProperties(container, nodeData, onChange) {
        // This logic remains as it's UI-specific for the properties panel
    }
}