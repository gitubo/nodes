import { CONFIG } from '../config.js';
import { eventBus } from '../EventBus.js';

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
        
    static render(currentSelection, d){

        const dimensions = d.getDimensions(); 

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

            const tx = (dimensions.width - bbox.width * scale) / 2 - bbox.x * scale;
            const ty = (dimensions.height - bbox.height * scale) / 2 - bbox.y * scale;

            path.attr("transform", `translate(${tx}, ${ty}) scale(${scale})`);
        }

        let yOffset = dimensions.height + CONFIG.node.labelTopMargin;
        if (d.label) {
            const capitalized = d.label.charAt(0).toUpperCase() + d.label.slice(1);
            const labelJoin = currentSelection.selectAll("text.node-label").data([d]);
            const entered = labelJoin.enter()
                .append("text")
                .attr("class", "node-label") 
                .attr("text-anchor", "middle");

            entered.merge(labelJoin)
                .attr("x", dimensions.width / 2)
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
                .attr("x", dimensions.width / 2)
                .attr("y", yOffset)
                .text(d.note);
            noteJoin.exit().remove();
        }
    }

    /**
     * FIX: Convertito a metodo di istanza. Usa 'this' per accedere ai dati.
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            position: { x: this.position.x, y: this.position.y },
            label: this.label,
            note: this.note, 
            data: this.data || {}, 
            handlers: this.handlers.map(h => ({
                id: h.id, 
                type: h.type, 
                label: h.label,
                // Serializza solo l'oggetto offset, il deserializzatore aggiungerà i campi piatti
                offset: { x: h.offset.x, y: h.offset.y }, 
                hideLabel: h.hideLabel,
                labelOffsetX: h.labelOffsetX,
                labelOffsetY: h.labelOffsetY
            }))
        };
    }
    
    /**
     * Mantenuto statico. Assicura che i nodi ripristinati siano istanze di classe con campi corretti.
     */
    static deserialize(data) {
        const instance = new this(data.position?.x || 0, data.position?.y || 0);

        instance.id = data.id;
        instance.type = data.type;
        instance.position = { x: data.position?.x || 0, y: data.position?.y || 0 };
        instance.label = data.label;
        instance.note = data.note;
        instance.data = data.data || {};

        instance.handlers = (data.handlers || []).map(h => {
            const offsetX = h.offset?.x || 0;
            const offsetY = h.offset?.y || 0;
            
            return {
                id: h.id,
                type: h.type,
                label: h.label,
                offset: { x: offsetX, y: offsetY },
                offset_x: offsetX, // FIX: Ripristina i campi piatti per il renderer D3 (risolve l'errore 'NaN')
                offset_y: offsetY, // FIX: Ripristina i campi piatti per il renderer D3 (risolve l'errore 'NaN')
                hideLabel: h.hideLabel,
                labelOffsetX: h.labelOffsetX,
                labelOffsetY: h.labelOffsetY,
            };
        });
        
        return instance;
    }

    static renderProperties(container, nodeData, onChange) {
    }
}