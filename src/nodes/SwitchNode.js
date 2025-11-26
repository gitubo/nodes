// src/nodes/SwitchNode.js - Renamed from DecisionNode
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';
import { TargetVerticalHandlerDefinition } from '../handlers/TargetVerticalHandler.js';

const DEFINITIONS = {
    sourceSeparator: 20,
    sourceHandlerLabels: ["yes", "no"]
};

export class SwitchNodeDefinition extends NodeDefinition {
    constructor(x, y, label, note, data) {
        super(x, y, label, note, data);
        this.type = 'switch';
        this.width = 120;
        this.height = 60;
        this.conditions = [];
        this.targetHandlers = [];
        this.targetHandlers.push(new TargetVerticalHandlerDefinition(0, 30));
        this.sourceHandlers = [];
        
        // Initialize default handlers
        DEFINITIONS.sourceHandlerLabels.forEach((label, i) => {
            //const radius = SourceHandlerDefinition.getDimension().radius + 2;
            const radius = 10;
            
            const offset = (DEFINITIONS.sourceSeparator + radius) + (DEFINITIONS.sourceSeparator + radius * 2) * i;
            this.sourceHandlers.push(new SourceHandlerDefinition(this.width, offset, label));
            //    labelPosition: 'left', labelMargin: 15
        });
    }
    
    static getDimensions(d) {
        const handlers = (Array.isArray(d?.handlers) ? d.handlers : []).filter(h => h.class === 'source');
        const radius = SourceHandlerDefinition.getDimension(d.sourceHandlers[0]).radius + 2;
        const height = DEFINITIONS.sourceSeparator + (DEFINITIONS.sourceSeparator + radius * 2) * handlers.length;
        return { width: 120, height: height };
    }

    static getHandlers(d) { return [...d.targetHandlers, ...d.sourceHandlers]; }
    
    // Reuse the Diamond shape path logic
    getShapePath() {
        const W = this.width;
        // Calculate dynamic height based on handlers for the path
        const radius = SourceHandlerDefinition.getDimension(this.sourceHandlers[0]).radius + 2;
        const handlerCount = Math.max(1, this.sourceHandlers.length);
        const H = DEFINITIONS.sourceSeparator + (DEFINITIONS.sourceSeparator + radius * 2) * handlerCount;
        
        const sR = CONFIG.node.smallBorderRadius;
        const srcSep = DEFINITIONS.sourceSeparator;
        const tH = TargetVerticalHandlerDefinition.getDimension(this.targetHandlers[0]).height;
        const tW = TargetVerticalHandlerDefinition.getDimension(this.targetHandlers[0]).width;
        
        let path = `M ${sR},0 L ${W-sR},0 A ${sR},${sR} 0 0 1 ${W},${sR}`;
        
        // Right side (source handlers)
        let currentY = 0;
        for(let i=0; i<handlerCount; i++) {
            currentY += srcSep;
            path += ` L ${W},${currentY}`; // Line to top of handler
            currentY += radius * 2;
            // Arc for handler
            path += ` A 1,1 0 0 0 ${W},${currentY}`; 
        }
        path += ` L ${W},${H-sR} A ${sR},${sR} 0 0 1 ${W-sR},${H}`;
        
        // Bottom
        path += ` L ${sR},${H} A ${sR},${sR} 0 0 1 0,${H-sR}`;
        
        // Left side (target handler)
        const inputY = 30;
        path += ` L 0,${inputY + tH/2 + 2} L ${tW/2 + 2},${inputY + tH/2 + 2}`;
        path += ` L ${tW/2 + 2},${inputY - tH/2 - 2} L 0,${inputY - tH/2 - 2}`;
        path += ` L 0,${sR} A ${sR},${sR} 0 0 1 ${sR},0 Z`;
        
        return path;
    }

    static serialize(node) {
        return { ...super.serialize(node), condition: node.condition };
    }
    
    static deserialize(data) {
        return { ...super.deserialize(data), condition: data.condition || '' };
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