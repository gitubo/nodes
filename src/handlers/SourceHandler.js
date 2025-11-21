// src/handlers/SourceHandler.js
import { HandlerDefinition } from './HandlerDefinition.js';
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { render } from '../render.js';
import { showContextMenu } from '../ContextMenu.js'; 

const DIMENSIONS = {
    radius: CONFIG.handler.radius
}

// Definiamo il drag behavior specifico per le label degli handler
const handlerLabelDrag = d3.drag()
    .on("start", function(event, d) {
        event.sourceEvent.stopPropagation(); // Evita di trascinare il nodo sotto
        d3.select(this).classed("dragging", true);
    })
    .on("drag", function(event, d) {
        // Aggiorniamo l'offset relativo nei dati dell'handler
        d.labelOffsetX = (d.labelOffsetX || 0) + event.dx;
        d.labelOffsetY = (d.labelOffsetY || 0) + event.dy;
        
        // Applichiamo immediatamente la trasformazione visiva
        // Nota: Non serve ricalcolare tutto qui, basta traslare della differenza (event.dx, event.dy)
        // Ma per robustezza, ricalcoliamo la posizione finale basata sulla logica di allineamento
        updateLabelPosition(d3.select(this), d, DIMENSIONS.radius);
    })
    .on("end", function(event) {
        d3.select(this).classed("dragging", false);
    });

// Funzione helper per calcolare e applicare la posizione
function updateLabelPosition(selection, d, radius) {
    // Configurazioni
    const margin = d.labelMargin !== undefined ? d.labelMargin : CONFIG.handler.label.margin;
    const position = d.labelPosition || CONFIG.handler.label.position;
    
    // Recuperiamo dimensioni box (già calcolate nel render o ricalcolate qui se necessario)
    // Per semplicità, assumiamo che il rect interno esista e usiamo le sue dimensioni se possibile
    // Altrimenti usiamo valori stimati o salvati. 
    // Nel contesto del drag, 'selection' è il gruppo <g>.
    const bgRect = selection.select(".link-label-bg");
    if (bgRect.empty()) return;
    
    const boxW = parseFloat(bgRect.attr("width"));
    const boxH = parseFloat(bgRect.attr("height"));
    
    const cx = radius / 2;
    const cy = radius / 2;
    const dist = radius + margin; // Distanza dal bordo handler

    // Calcolo coordinate Base (Centro del Box Label rispetto a Centro Handler)
    let tx = 0;
    let ty = 0;

    switch (position) {
        // Orizzontali: Allineamento Y centro-centro (ty = cy)
        case 'left':
            tx = cx - dist - (boxW / 2);
            ty = cy;
            break;
        case 'right':
            tx = cx + dist + (boxW / 2);
            ty = cy;
            break;
        // Verticali: Allineamento X centro-centro (tx = cx)
        case 'top':
            tx = cx;
            ty = cy - dist - (boxH / 2);
            break;
        case 'bottom':
            tx = cx;
            ty = cy + dist + (boxH / 2);
            break;
        // Angolari
        case 'top-left':
            tx = cx - dist - (boxW / 2);
            ty = cy - dist - (boxH / 2);
            break;
        case 'top-right':
            tx = cx + dist + (boxW / 2);
            ty = cy - dist - (boxH / 2);
            break;
        case 'bottom-left':
            tx = cx - dist - (boxW / 2);
            ty = cy + dist + (boxH / 2);
            break;
        case 'bottom-right':
            tx = cx + dist + (boxW / 2);
            ty = cy + dist + (boxH / 2);
            break;
        default: 
            tx = cx - dist - (boxW / 2);
            ty = cy;
    }

    // Aggiungiamo l'offset manuale del drag 'n' drop
    tx += (d.labelOffsetX || 0);
    ty += (d.labelOffsetY || 0);

    selection.attr("transform", `translate(${tx}, ${ty})`);
}

export class SourceHandlerDefinition extends HandlerDefinition {
    constructor() {
        super();
        this.type = 'source';
    }

    static getDimension() {
        return DIMENSIONS;
    }
    
    render(selection) {
        const radius = DIMENSIONS.radius;
        const cx = radius / 2;
        const cy = radius / 2;

        // 1. Cerchio Handler
        // Aggiungiamo gestione evento Context Menu separata
        selection.append("circle")
            .attr("class", "handler source")
            .attr("x", cx)
            .attr("y", cy)
            .attr("r", radius)
            .on("contextmenu", (event, d) => {
                event.preventDefault();
                event.stopPropagation(); // <--- STOP PROPAGATION QUI
                // Chiamiamo una nuova funzione per il menu handler
                import('../ContextMenu.js').then(module => {
                    module.showHandlerContextMenu(event, d);
                });
            });

        // 2. Label
        selection.each(function(d) {
            // Se hideLabel è true, non renderizziamo nulla
            console.log("render <"+d.type+"> -> "+d.hideLabel);
            if (!d.label || d.hideLabel) return;
            console.log("rendering <"+d.label+">");

            const group = d3.select(this);
            group.selectAll(".handler-label-group").remove();

            const labelGroup = group.append("g")
                .attr("class", "handler-label-group")
                .style("cursor", "grab") // Cursore mano
                .call(handlerLabelDrag); // Attacchiamo il drag

            // A. Testo
            const text = labelGroup.append("text")
                .attr("class", "link-label-text")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .style("pointer-events", "none") // Il testo non blocca il drag
                .text(d.label);

            const bbox = text.node().getBBox();
            const paddingX = 5;
            const paddingY = 3;
            const boxW = bbox.width + (paddingX * 2);
            const boxH = bbox.height + (paddingY * 2);

            // B. Sfondo (Centrato su 0,0 del gruppo label)
            labelGroup.insert("rect", "text")
                .attr("class", "link-label-bg")
                .attr("rx", 4)
                .attr("ry", 4)
                .attr("x", -boxW / 2) 
                .attr("y", -boxH / 2)
                .attr("width", boxW)
                .attr("height", boxH);

            // C. Posizionamento Iniziale
            updateLabelPosition(labelGroup, d, radius);
        });

        this.setupDrag(selection);
    }
    
    setupDrag(selection) {
        selection.call(d3.drag()
            .on("start", (event, d) => {
                event.sourceEvent.stopPropagation();
                const viewport = d3.select("g.viewport").node();
                const [mouseX, mouseY] = d3.pointer(event.sourceEvent, viewport);
                
                state.ui.ghostLink = {
                    sourceId: d.id,
                    targetX: mouseX,
                    targetY: mouseY
                };
                render();
            })
            .on("drag", (event) => {
                const viewport = d3.select("g.viewport").node();
                const [mouseX, mouseY] = d3.pointer(event.sourceEvent, viewport);
                
                if (state.ui.ghostLink) {
                    state.ui.ghostLink.targetX = mouseX;
                    state.ui.ghostLink.targetY = mouseY;
                }
                render();
            })
            .on("end", (event, d) => {
                const targetElement = event.sourceEvent.target;
                const targetData = d3.select(targetElement).datum();
                
                if (targetData && targetData.type === 'target') {
                    state.links.push({
                        id: `link_${Date.now()}`,
                        source: state.ui.ghostLink.sourceId,
                        target: targetData.id
                    });
                }
                
                state.ui.ghostLink = null;
                render();
            })
        );
    }
}