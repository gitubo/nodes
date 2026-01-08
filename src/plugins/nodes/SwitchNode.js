import { NodeDefinition, NODE_ROLES, CONFIG } from '../../core/sdk.js';
import SourceHandlerDefinition from '../handles/SourceHandler.js'; 
import TargetVerticalHandlerDefinition from '../handles/TargetVerticalHandler.js';
import { getIcon } from '../../components/Icons.js';

/**
 * Custom Handler that separates connection direction from label positioning.
 * Connection Direction: 'right' (Outbound)
 * Label Positioning: 'left' (Inside the node)
 */
class SwitchPortHandler extends SourceHandlerDefinition {
    constructor(x, y, label) {
        // Pass 'right' to super so the link engine knows connections go outwards
        super(x, y, label, 'right');
    }

    /**
     * Override renderLabel to force specific alignment regardless of handle direction.
     * We want the label to appear to the LEFT of the handle (inside the switch node).
     */
    renderLabel(group) {
        if (!this.label) return;
        
        // Clean up previous labels
        group.selectAll(".handler-label-group").remove();

        const labelGroup = group.append("g")
            .attr("class", "handler-label-group")
            .style("cursor", "move");

        // Styling
        const customColor = 'var(--platinum)'; // White text
        const fontSize = '14px';
        const margin = 18; // Distance from center of handle

        // 1. Render Text
        const textEl = labelGroup.append("text")
            .attr("class", "handler-label-text")
            .text(this.label)
            .attr("dominant-baseline", "middle")
            .attr("y", 1)
            .style("fill", customColor)
            .style("font-size", fontSize)
            .style("font-weight", "bold");

        // 2. Force Left Alignment (Anchor End)
        // This places the text to the left of the (0,0) handle center
        textEl.attr("text-anchor", "end"); 
        
        // 3. Position the group to the left of the handle
        labelGroup.attr("transform", `translate(-${margin}, 0)`);
    }
}

export default class SwitchNodeDefinition extends NodeDefinition {

    static get type() { return 'switch'; }

    constructor(x, y, label, note, data) {
        super(x, y, 'switch', note, data);
        this.width = CONFIG.node.width * 2;

        // 1. Ensure Data Integrity
        if (!this.data) this.data = {};
        if (!this.data.sources) {
            this.data.sources = [
                { label: 'yes', condition: 'true' },
                { label: 'no', condition: 'false' }
            ];
        }

        // 2. Setup Input Handler (Top)
        // Use a lazy init check or recreate it safely
        this.targetHandlers = [
            new TargetVerticalHandlerDefinition(0, CONFIG.node.handlerSeparator*2)
        ];

        // 3. Build Source Handlers
        this.rebuildHandlers();
    }

    // Reactivity: Rebuild handlers when data changes (e.g. from Properties Panel)
    get data() { return this._data; }
    set data(val) {
        this._data = val;
        this.rebuildHandlers();
    }

    rebuildHandlers() {
        // Safety check if called before constructor finishes
        if (!this.targetHandlers) return; 

        this.sourceHandlers = [];
        const sources = (this.data && this.data.sources) ? this.data.sources : [];

        sources.forEach((source, i) => {
            // Calculate Y position for this handler
            const offset = (CONFIG.node.handlerSeparator * 4) + (CONFIG.node.handlerSeparator * 2) * i;
            
            // Use our Custom Handler class
            const handler = new SwitchPortHandler(this.width, offset, source.label);
            
            // Visual Styling for the Handle itself (the circle)
            handler.backgroundColor = 'var(--baltic-blue)'; 
            handler.borderColor = 'var(--platinum)';
            
            this.sourceHandlers.push(handler);
        });

        // Update the main handler list
        this.handlers = [...this.targetHandlers, ...this.sourceHandlers];

        // Recalculate Node Height
        this.height = (CONFIG.node.handlerSeparator * 3) + 
                      (CONFIG.node.handlerSeparator * 2) * this.sourceHandlers.length +
                      CONFIG.node.smallBorderRadius;
    }

    static get role() { return NODE_ROLES.LOGIC; }
    static hasTargetHandlers() { return true; }

    getDimensions() {
        // Ensure dimensions reflect dynamic height
        return { width: this.width, height: this.height };
    }

    // --- RENDERER: Shape Template ---
    getShapeTemplate() {
        const W = this.width;
        const H = this.height;
        const sR = CONFIG.node.smallBorderRadius;
        
        // Construct path: Top -> Right (with cutouts) -> Bottom -> Left -> Close
        let path = `M ${sR},0 L ${W-sR},0 A ${sR},${sR} 0 0 1 ${W},${sR}`;
        
        // Draw Dynamic Output Ports
        const sources = this.sourceHandlers || [];
        const handlerCount = sources.length;
        
        // Assuming uniform size for standard SourceHandler
        const hRadius = CONFIG.handler.radius;
        const hMargin = CONFIG.handler.margin;
        const handleFootprint = (hRadius + hMargin) * 2;
        
        // Starting Y for first handler
        let currentY = CONFIG.node.handlerSeparator * 3.5 - hMargin;

        for(let i=0; i<handlerCount; i++) {
            // Line to top of handler
            path += ` L ${W},${currentY}`;
            
            currentY += handleFootprint;
            // Arc cutout for handler
            path += ` A 1,1 0 0 0 ${W},${currentY}`;
            
            // Gap to next handler
            currentY += CONFIG.node.handlerSeparator - hMargin;
            currentY -= hMargin;
        }

        // Close Bottom Right
        path += ` L ${W},${H-sR} A ${sR},${sR} 0 0 1 ${W-sR},${H}`;
        // Bottom Line
        path += ` L ${sR},${H} A ${sR},${sR} 0 0 1 0,${H-sR}`;

        // Left Side Input Port
        // We know the input is fixed at a specific Y
        const inputY = CONFIG.node.handlerSeparator * 2;
        const tH = TargetVerticalHandlerDefinition.getDimension(this.targetHandlers[0]).height / 2 + CONFIG.handler.margin;
        const tW = TargetVerticalHandlerDefinition.getDimension(this.targetHandlers[0]).width / 2 + CONFIG.handler.margin;
        
        path += ` L 0,${inputY + tH} L ${tW},${inputY + tH}`;
        path += ` L ${tW},${inputY - tH} L 0,${inputY - tH}`;
        
        // Close Top Left
        path += ` L 0,${sR} A ${sR},${sR} 0 0 1 ${sR},0 Z`;

        return `<path d="${path}" />`;
    }

    static getIconPath() { 
        return 'M39.5 24.2l4.2 4.2q1.4-1.3 3.7-2.8t4.8-2.4l-1.5-5.9q-3.5 1.1-6.45 3.15T39.5 24.2Zm17.1-8.4 1.4 5.8q2.1-.4 4.95-.5t6.65.1l-9 9 4.2 4.2L81 18.2 64.8 2 60.6 6.2l8.9 8.9q-4.2-.2-7.65.05T56.6 15.8ZM1 35v6H21q4.6 0 7.9 1.55T36.2 48.5q6.3 6.9 13.55 9.85T69.6 60.8l-9 9 4.2 4.2L81 57.8 64.8 41.6l-4.2 4.2 9 9q-10.8.6-17.45-1.95T40.8 44.5q-1.3-1.5-3.2-3.15T33.1 38q1.6-1 3.5-2.45T39.6 32.8l-4.3-4.3q-3.3 3.3-6.4 4.9t-7.9 1.6H1Z';
    }

    // --- PROPERTIES PANEL UI ---
    static renderProperties(container, nodeData, onChange) {
        // Render standard properties (Label, Note, etc.)
        super.renderProperties(container, nodeData, onChange);

        // --- Custom Section: Output Paths ---
        
        // 1. Header
        const header = document.createElement('div');
        header.style.marginTop = '15px';
        header.style.marginBottom = '10px';
        header.style.fontWeight = 'bold';
        header.style.color = 'var(--baltic-blue)';
        header.style.fontSize = '12px';
        header.innerText = "SWITCH PATHS";
        container.appendChild(header);

        // 2. List Container
        const listContainer = document.createElement('div');
        listContainer.className = 'switch-paths-list';
        container.appendChild(listContainer);

        // Helper to redraw the list
        const renderList = () => {
            listContainer.innerHTML = '';
            
            if (!nodeData.data.sources) nodeData.data.sources = [];
            const sources = nodeData.data.sources;

            sources.forEach((item, index) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '8px';
                row.style.marginBottom = '8px';
                row.style.background = '#f8f9fa';
                row.style.padding = '6px';
                row.style.borderRadius = '4px';
                row.style.border = '1px solid #eee';

                // Label Input
                const labelInput = document.createElement('input');
                labelInput.className = 'prop-input';
                labelInput.value = item.label;
                labelInput.placeholder = "Label (e.g. 'yes')";
                labelInput.style.flex = '1';
                // Update Logic
                labelInput.oninput = (e) => {
                    item.label = e.target.value;
                    onChange(nodeData); // Triggers Data Setter -> rebuildHandlers
                };

                // Condition Input (Tooltip for JS code)
                const condInput = document.createElement('input');
                condInput.className = 'prop-input';
                condInput.value = item.condition;
                condInput.placeholder = "JS Condition";
                condInput.title = "Expression, e.g. 'msg.value > 10'";
                condInput.style.flex = '1';
                condInput.oninput = (e) => {
                    item.condition = e.target.value;
                    onChange(nodeData);
                };

                // Delete Button
                const delBtn = document.createElement('button');
                delBtn.className = 'icon-btn';
                delBtn.style.color = 'var(--danger)';
                delBtn.innerHTML = getIcon('delete', 18);
                delBtn.title = "Remove path";
                delBtn.onclick = () => {
                    // Remove item
                    sources.splice(index, 1);
                    // Update State
                    onChange(nodeData);
                    // Re-render UI
                    renderList();
                };

                row.appendChild(labelInput);
                row.appendChild(condInput);
                row.appendChild(delBtn);
                listContainer.appendChild(row);
            });
        };

        // Initial Render
        renderList();

        // 3. Add Button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-standard';
        addBtn.style.marginTop = '5px';
        addBtn.innerHTML = `<span style="display:flex; align-items:center; justify-content:center; gap:5px;">${getIcon('plus', 16)} Add Case</span>`;
        addBtn.onclick = () => {
            if (!nodeData.data.sources) nodeData.data.sources = [];
            nodeData.data.sources.push({ label: 'case', condition: 'true' });
            onChange(nodeData);
            renderList();
        };
        container.appendChild(addBtn);
    }
}