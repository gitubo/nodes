import { CONFIG } from '../config.js';

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
        this.dimensions = {};
    }

    static getId(d) { return d.id; }
    static getDimensions(d) { return d.dimensions || {}; }
    static getHandlers(d) { return d.handlers || []; }
    static getData(d) { return d.data || {}; }

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
        
    static render(currentSelection, d){
        currentSelection.append("path")
            .attr("class", `node-body ${d.type}`)
            .attr("d", d.getShapePath())
            .lower(); 

        const icon = d.getIconPath();
        if(icon && icon !== ''){
            const size = CONFIG.node.iconSize;
            const path = currentSelection.append("path")
            .attr("class", "node-icon")
            .attr("d", icon)

            const bbox = path.node().getBBox();

            const scale = size / Math.max(bbox.width, bbox.height);

            const tx = (d.width - bbox.width * scale) / 2 - bbox.x * scale;
            const ty = (d.height - bbox.height * scale) / 2 - bbox.y * scale;

            path.attr("transform", `translate(${tx}, ${ty}) scale(${scale})`);
        }

        let yOffset = d.height + CONFIG.node.labelTopMargin;
        if (d.label) {
            const capitalized = d.label.charAt(0).toUpperCase() + d.label.slice(1);
            const labelJoin = currentSelection.selectAll("text.node-label").data([d]);
            const entered = labelJoin.enter()
                .append("text")
                .attr("class", "node-label") 
                .attr("text-anchor", "middle");

            entered.merge(labelJoin)
                .attr("x", d.width / 2)
                .attr("y", yOffset)
                .text(capitalized)
                .on("dblclick", (e, d) => {
                    e.stopPropagation();
                    startInlineEditing(e, d.label, (val) => {
                        d.label = val;
                        eventBus.emit('NODE_UPDATED', { id: d.id });
                    });
                });
            labelJoin.exit().remove();
            yOffset += CONFIG.node.noteTopMargin;
        }
        if (d.note) {
            const noteJoin = currentSelection.selectAll("text.node-note").data([d]);
            noteJoin.enter()
                .append("text")
                .attr("class", "node-note") 
                .attr("text-anchor", "middle")
                .merge(noteJoin)
                .attr("x", d.width / 2)
                .attr("y", yOffset)
                .text(d.note);
            noteJoin.exit().remove();
        }
    }

    static serialize(node) {
        return {
            id: node.id,
            type: node.type,
            position: { x: node.position.x, y: node.position.y },
            label: node.label,
            note: node.note, 
            data: node.data || {}, 
            handlers: node.handlers.map(h => ({
                id: h.id, 
                type: h.type, 
                label: h.label,
                offset: { x: h.offset.x, y: h.offset.y },
                hideLabel: h.hideLabel,
                labelOffsetX: h.labelOffsetX,
                labelOffsetY: h.labelOffsetY
            }))
        };
    }
    
    static deserialize(data) {
        return {
            id: data.id,
            type: data.type,
            x: data.position?.x || 0,
            y: data.position?.y || 0,
            label: data.label,
            note: data.note,
            data: data.data || {},
            handlers: (data.handlers || []).map(h => ({
                ...h,
                offset_x: h.offset?.x || 0,
                offset_y: h.offset?.y || 0
            })) || this.getHandlers()
        };
    }

    static renderProperties(container, nodeData, onChange) {
    }
}