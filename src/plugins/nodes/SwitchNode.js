import { NodeDefinition, NODE_ROLES, CONFIG } from '../../core/sdk.js';
import SourceHandlerDefinition from '../handles/SourceHandler.js'; 
import TargetVerticalHandlerDefinition from '../handles/TargetVerticalHandler.js';

const DEFINITIONS = {
    sourceHandlerLabels: ["yes", "no", "maybe"]
};

export default class SwitchNodeDefinition extends NodeDefinition {

    static get type() { return 'switch'; }

    constructor(x, y, _label, note, data) {
        super(x, y, 'switch', note, data);
        this.conditions = [];
        this.targetHandlers = [];
        this.targetHandlers.push(new TargetVerticalHandlerDefinition(0, CONFIG.node.handlerSeparator*2));
        this.sourceHandlers = [];
        this.width = CONFIG.node.width*2;
        // Initialize default handlers
        DEFINITIONS.sourceHandlerLabels.forEach((label, i) => {
            const offset = (CONFIG.node.handlerSeparator*4) + (CONFIG.node.handlerSeparator*2 )*i;
            this.sourceHandlers.push(new SourceHandlerDefinition(this.width, offset, label));
        });
        this.height = CONFIG.node.handlerSeparator*2*( this.sourceHandlers.length+1);
        
        // Combine handlers for the base class
        this.handlers = [...this.targetHandlers, ...this.sourceHandlers];
    }

    static getRole() { return NODE_ROLES.LOGIC; }

    static hasTargetHandlers() { return true; }

    getDimensions() {
        const w = this.width;
        const h = (CONFIG.node.handlerSeparator*3) + 
                  (CONFIG.node.handlerSeparator*2 )*this.sourceHandlers.length +
                  CONFIG.node.smallBorderRadius;
        return { width: w, height: h};
    }

    static getIconPath() { return 'M39.5 24.2l4.2 4.2q1.4-1.3 3.7-2.8t4.8-2.4l-1.5-5.9q-3.5 1.1-6.45 3.15T39.5 24.2Zm17.1-8.4 1.4 5.8q2.1-.4 4.95-.5t6.65.1l-9 9 4.2 4.2L81 18.2 64.8 2 60.6 6.2l8.9 8.9q-4.2-.2-7.65.05T56.6 15.8ZM1 35v6H21q4.6 0 7.9 1.55T36.2 48.5q6.3 6.9 13.55 9.85T69.6 60.8l-9 9 4.2 4.2L81 57.8 64.8 41.6l-4.2 4.2 9 9q-10.8.6-17.45-1.95T40.8 44.5q-1.3-1.5-3.2-3.15T33.1 38q1.6-1 3.5-2.45T39.6 32.8l-4.3-4.3q-3.3 3.3-6.4 4.9t-7.9 1.6H1Z'; }

    getHandlers() { return [...this.targetHandlers, ...this.sourceHandlers]; }
    
    getShapePath() {
        const W = this.width;
        const sR = CONFIG.node.smallBorderRadius;
        
        // Top
        let path = `M ${sR},0 L ${W-sR},0 A ${sR},${sR} 0 0 1 ${W},${sR}`;
        
        // Right side (source handlers)
        const handleFootprint = (SourceHandlerDefinition.getDimension(this.sourceHandlers[0]).radius + CONFIG.handler.margin) * 2;
        const handlerCount = Math.max(1, this.sourceHandlers.length);
        let currentY = CONFIG.node.handlerSeparator*3.5 - CONFIG.handler.margin;
        for(let i=0; i<handlerCount; i++) {
            path += ` L ${W},${currentY}`;
            currentY += handleFootprint;
            path += ` A 1,1 0 0 0 ${W},${currentY}`; 
            currentY += CONFIG.node.handlerSeparator - CONFIG.handler.margin;
            currentY -= CONFIG.handler.margin;
        }
        const H = (CONFIG.node.handlerSeparator*3) + 
                  (CONFIG.node.handlerSeparator*2 )*this.sourceHandlers.length +
                  CONFIG.node.smallBorderRadius;
        path += ` L ${W},${H-sR} A ${sR},${sR} 0 0 1 ${W-sR},${H}`;
        
        // Bottom
        path += ` L ${sR},${H} A ${sR},${sR} 0 0 1 0,${H-sR}`;
        
        // Left side (target handler)
        const tH = TargetVerticalHandlerDefinition.getDimension(this.targetHandlers[0]).height / 2 + CONFIG.handler.margin;
        const tW = TargetVerticalHandlerDefinition.getDimension(this.targetHandlers[0]).width / 2 + CONFIG.handler.margin;
        const inputY = CONFIG.node.handlerSeparator*2;
        path += ` L 0,${inputY + tH} L ${tW},${inputY + tH}`;
        path += ` L ${tW},${inputY - tH} L 0,${inputY - tH}`;
        path += ` L 0,${sR} A ${sR},${sR} 0 0 1 ${sR},0 Z`;
        return path;
    }

    static renderProperties(container, nodeData, onChange) {
        // 1. Render base properties
        super.renderProperties(container, nodeData, onChange);

        // 2. Render Switch-specific properties
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="panel-separator" style="margin: 15px 0; background: #eee;"></div>
            <div class="property-group">
                <label style="color: var(--baltic-blue); font-weight:bold;">Switch Condition</label>
                <textarea class="prop-input" data-key="condition" rows="3"
                    style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:monospace;">${nodeData.condition || ''}</textarea>
            </div>
        `;
        container.appendChild(div);
        
        // Re-attach listeners for new elements
        this.attachListeners(div, onChange);
    }
}