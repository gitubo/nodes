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

    getShapePath() {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const sR = CONFIG.node.smallBorderRadius;
        return `M ${sR},0 L ${W - sR},0 A ${sR},${sR} 0 0 1 ${W},${sR} L ${W},${H - sR} A ${sR},${sR} 0 0 1 ${W - sR},${H} L ${sR},${H} A ${sR},${sR} 0 0 1 0,${H - sR} L 0,${sR} A ${sR},${sR} 0 0 1 ${sR},0 Z`;
    }
    
    serialize(node) {
        return {
            id: node.id, type: node.type, x: node.x, y: node.y, label: node.label, sublabel: node.sublabel,
            handlers: node.handlers.map(h => ({
                id: h.id, type: h.type, label: h.label, 
                offset_x: h.offset_x, offset_y: h.offset_y, 
                hideLabel: h.hideLabel, labelOffsetX: h.labelOffsetX, labelOffsetY: h.labelOffsetY
            }))
        };
    }
    
    deserialize(data) {
        return {
            id: data.id, type: data.type, x: data.x || 0, y: data.y || 0,
            label: data.label, sublabel: data.sublabel,
            handlers: data.handlers || this.getHandlers()
        };
    }

    /**
     * Renders properties into the container.
     * @param {HTMLElement} container 
     * @param {Object} nodeData 
     * @param {Function} onChange (key, value) => void
     */
    renderProperties(container, nodeData, onChange) {
        container.innerHTML = `
            <div class="property-group">
                <label>Label</label>
                <input type="text" value="${nodeData.label || ''}" data-key="label" class="prop-input">
            </div>
            <div class="property-group">
                <label>Sublabel</label>
                <input type="text" value="${nodeData.sublabel || ''}" data-key="sublabel" class="prop-input">
            </div>
        `;
        this.attachListeners(container, onChange);
    }

    attachListeners(container, onChange) {
        container.querySelectorAll('.prop-input').forEach(input => {
            input.addEventListener('change', (e) => {
                onChange(e.target.dataset.key, e.target.value);
            });
        });
    }
}