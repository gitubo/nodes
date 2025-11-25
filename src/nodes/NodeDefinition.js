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
//    static getBodyClass(d) { return `node-body ${d.type}`; }
    static getShapePath(_d) { return ''; } 

    static render(currentSelection, d){
        currentSelection.append("path")
            .attr("class", `node-body ${d.type}`)
            .attr("d", this.getShapePath(d))
            .lower(); 

        
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