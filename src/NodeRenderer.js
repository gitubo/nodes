// NodeRenderer.js - GPU accelerated with requestAnimationFrame batching
import { registry } from './Registry.js';
import { CONFIG } from './config.js';
import { snapToGrid } from './config.js';
import { updateLinksOnly } from './render.js';
import { updateAddNodeHelpers } from './AddNodeHelper.js';

const DIMENSIONS = {
    label_margin: 20,
    sublabel_margin: 20
}

// Global RAF throttling
let rafId = null;
let pendingLinkUpdate = false;

function scheduleLinksUpdate() {
    if (pendingLinkUpdate) return;
    
    pendingLinkUpdate = true;
    
    if (rafId) cancelAnimationFrame(rafId);
    
    rafId = requestAnimationFrame(() => {
        updateLinksOnly();
        pendingLinkUpdate = false;
        rafId = null;
    });
}

export class NodeRenderer {
    constructor(renderCallback) {
        this.renderCallback = renderCallback;
    }
    
    renderBody(selection) {
        selection.each(function(d) {
            const currentSelection = d3.select(this);
            const definition = registry.getNodeDefinition(d.type);
            if (!definition) return;
            
            currentSelection.selectAll("path.node-body").remove();
            currentSelection.append("path")
                .attr("class", definition.getBodyClass())
                .attr("d", definition.getShapePath());
        });
    }
    
    renderLabels(selection) {
        selection.each(function(d) {
            const currentSelection = d3.select(this);
            const definition = registry.getNodeDefinition(d.type);
            let nodeWidth = 0;
            let nodeHeight = 0;

            // 2. Chiedi alla definizione le dimensioni, passando i dati attuali (d)
            // Se la definizione ha un metodo getDimensions, usalo.
            if (definition && typeof definition.getDimensions === 'function') {
                const dims = definition.getDimensions(d); 
                nodeWidth = dims.width;
                nodeHeight = dims.height;
            } 
            // 3. Fallback sui dati statici se la definizione non risponde
            else {
                if (d.width) nodeWidth = d.width;
                if (d.height) nodeHeight = d.height;
            }
            let yOffset = nodeHeight + DIMENSIONS.label_margin;

            if (d.label) {
                const labelJoin = currentSelection.selectAll(".node-label")
                    .data([d]);

                labelJoin.enter()
                    .append("text")
                    .attr("class", "node-label")
                    .attr("text-anchor", "middle")
                    .merge(labelJoin)
                    .attr("x", nodeWidth / 2)
                    .attr("y", yOffset)
                    .text(d.label);

                labelJoin.exit().remove();
                yOffset += DIMENSIONS.sublabel_margin;
            }

            if (d.sublabel) {
                const sublabelJoin = currentSelection.selectAll(".node-sublabel")
                    .data([d]);

                sublabelJoin.enter()
                    .append("text")
                    .attr("class", "node-sublabel")
                    .attr("text-anchor", "middle")
                    .merge(sublabelJoin)
                    .attr("x", nodeWidth / 2)
                    .attr("y", yOffset)
                    .text(d.sublabel);

                sublabelJoin.exit().remove();
            }
        });
    }
    
    renderHandlers(selection) {
        selection.selectAll("g.handler-g")
            .data(d => d.handlers, h => h.id)
            .join(
                enter => {
                    const handlerGroup = enter.append("g")
                        .attr("class", d => `handler-g ${d.type}`)
                        .attr("transform", d => `translate(${d.offset_x || 0}, ${d.offset_y || 0})`);
                    
                    handlerGroup.each(function(h) {
                        const handlerDef = registry.getHandlerDefinition(h.type);
                        if (handlerDef) {
                            handlerDef.render(d3.select(this)); 
                        }
                    });
                    
                    return handlerGroup;
                },
                update => {
                    update.attr("transform", d => `translate(${d.offset_x || 0}, ${d.offset_y || 0})`);
                    
                    // FIX: Propagate new data to the children (the circles)
                    update.each(function(d) {
                        // Re-select children and update their datum
                        d3.select(this).selectAll(".handler").datum(d);
                    });
                    
                    return update;
                },
                exit => exit.remove()
            );
    }
    
    setupDrag(selection) {
        const dragBehavior = d3.drag()
            .on("start", function(event, d) {
                d3.select(this).raise();
                d3.select(this).classed("dragging", true);
                
                // RIMUOVI O COMMENTA QUESTO BLOCCO CHE CANCELLAVA IL RAF
                /* if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                    pendingLinkUpdate = false;
                }
                */
            })
            .on("drag", function(event, d) {
                d.x = event.x;
                d.y = event.y;
                
                // 1. Il nodo si muove qui (immediato)
                d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
                
                // 2. CAMBIO CRITICO:
                // Invece di scheduleLinksUpdate(); che aspetta il prossimo frame...
                // Chiamiamo direttamente l'aggiornamento sincrono.
                updateLinksOnly(); 
                
                // Aggiorna helper durante drag (questo va bene lasciarlo qui)
                import('./AddNodeHelper.js').then(module => {
                    module.updateAddNodeHelpers();
                });
            })
            .on("end", function(event, d) {
                d3.select(this).classed("dragging", false);
                
                // Rimuovi o commenta la logica del rafId se presente
                /* if (rafId) { cancelAnimationFrame(rafId); rafId = null; pendingLinkUpdate = false; } */
                
                // Calcola destinazione griglia
                const snappedX = snapToGrid(d.x);
                const snappedY = snapToGrid(d.y);
                
                // Se il nodo non è allineato, anima lo spostamento
                if (snappedX !== d.x || snappedY !== d.y) {
                    
                    // Salviamo la posizione di partenza (dove ho rilasciato il mouse)
                    const startX = d.x;
                    const startY = d.y;
                    
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .ease(d3.easeCubicOut)
                        // USIAMO TWEEN PER AGGIORNARE TUTTO INSIEME
                        .tween("snap-animation", function() {
                            // Crea interpolatori per X e Y
                            const iX = d3.interpolateNumber(startX, snappedX);
                            const iY = d3.interpolateNumber(startY, snappedY);
                            
                            // Questa funzione viene eseguita ad ogni frame dell'animazione (t va da 0 a 1)
                            return function(t) {
                                // 1. Aggiorna coordinate dati
                                d.x = iX(t);
                                d.y = iY(t);
                                
                                // 2. Aggiorna visivamente il nodo
                                d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
                                
                                // 3. Aggiorna Link ed Helper sincronizzati!
                                updateLinksOnly();
                                updateAddNodeHelpers();
                            };
                        })
                        .on("end", () => {
                            // Alla fine assicuriamo precisione matematica
                            d.x = snappedX;
                            d.y = snappedY;
                            updateLinksOnly();
                            updateAddNodeHelpers();
                        });
                        
                } else {
                    // Se è già sulla griglia, aggiorniamo solo una volta
                    updateLinksOnly();
                    updateAddNodeHelpers();
                }
            });
        
        selection.call(dragBehavior);
    }
    
    render(selection) {
        this.renderBody(selection);
        this.renderLabels(selection);
        this.renderHandlers(selection);
        this.setupDrag(selection);
        
        // Setup context menu
        import('./ContextMenu.js').then(module => {
            module.setupNodeContextMenu(selection);
        });
    }
    
    update(selection) {
        this.renderHandlers(selection);
    }
}