import { NodeDefinition, NODE_ROLES } from './NodeDefinition.js';
import { CONFIG } from '../core/config.js';
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';
import { TargetVerticalHandlerDefinition } from '../handlers/TargetVerticalHandler.js';

const DEFINITIONS = {
    sourceHandlerLabels: ["yes", "no", "maybe"]
};

export class SwitchNodeDefinition extends NodeDefinition {
    constructor(x, y, _label, note, data) {
        super(x, y, 'switch', note, data);
        this.type = 'switch';
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
        const h = CONFIG.node.handlerSeparator*2*( this.sourceHandlers.length+1);
        return { width: w, height: h};
    }

    static getIconPath() { return 'M465 342l42 42q14-13 37-28t48-24l-15-59q-35 11-64.5 31.5T465 342Zm171-84 14 58q21-4 49.5-5t66.5 1l-90 90 42 42L880 282 718 120l-42 42 89 89q-42-2-76.5.5T636 258ZM80 450v60H280q46 0 79 15.5T432 585q63 69 135.5 98.5T766 708l-90 90 42 42L880 678 718 516l-42 42 90 90q-108 6-174.5-19.5T478 545q-13-15-32-31.5T401 480q16-10 35-24.5T466 428l-43-43q-33 33-64 49t-79 16H80Z'; }

    getHandlers() { return [...this.targetHandlers, ...this.sourceHandlers]; }
    
    // Reuse the Diamond shape path logic
    getShapePath() {
        const W = this.width;
        const sR = CONFIG.node.smallBorderRadius;
        
        // Top
        let path = `M ${sR},0 L ${W-sR},0 A ${sR},${sR} 0 0 1 ${W},${sR}`;
        
        // Right side (source handlers)
        const handleFootprint = (SourceHandlerDefinition.getDimension(this.sourceHandlers[0]).radius + CONFIG.handler.margin) * 2;
        const handlerCount = Math.max(1, this.sourceHandlers.length);
        let currentY = CONFIG.node.handlerSeparator-sR;
        for(let i=0; i<handlerCount; i++) {
            currentY += CONFIG.node.handlerSeparator - CONFIG.handler.margin;
            path += ` L ${W},${currentY}`;
            currentY += handleFootprint;
            path += ` A 1,1 0 0 0 ${W},${currentY}`; 
            currentY -= CONFIG.handler.margin;
        }
        const H = CONFIG.node.handlerSeparator*2*( this.sourceHandlers.length+1);
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

    // --- MODULAR PROPERTIES ---
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