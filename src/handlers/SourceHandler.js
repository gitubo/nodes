// src/handlers/SourceHandler.js

import { HandlerDefinition } from './HandlerDefinition.js';
import { CONFIG } from '../config.js';
import { linkInteractionManager } from '../LinkInteractionManager.js';
import { eventBus } from '../EventBus.js';
import { startInlineEditing } from '../InlineEditor.js';

export class SourceHandlerDefinition extends HandlerDefinition {
    constructor(x, y, label) {
        super(x, y, label);
        this.role = 'source';
        this.type = 'source';
        this.dimensions = { radius: CONFIG.handler.radius };
    }
    
    /**
     * Renderizza o aggiorna l'handler.
     * Utilizza .join() per aggiornare gli elementi esistenti invece di ricrearli.
     */
    render(selection) {
        const radius = CONFIG.handler.radius;
        const cx = 0;
        const cy = 0;

        // 1. CERCHIO DELL'HANDLER (Il punto di connessione)
        // Usiamo data([this]) per legare l'istanza corrente all'elemento SVG
        selection.selectAll("circle.handler.source")
            .data([this])
            .join(
                enter => enter.append("circle")
                    .attr("class", "handler source")
                    .attr("cx", cx)
                    .attr("cy", cy)
                    .attr("r", radius)
                    // Il menu contestuale si attacca solo alla creazione
                    .on("contextmenu", (event, d) => {
                        import('../ContextMenu.js').then(m => m.showHandlerContextMenu(event, d));
                    }),
                update => update
                    .attr("r", radius) // Aggiorna raggio se config cambia
            );

        // 2. ETICHETTA (LABEL)
        // Determiniamo se dobbiamo disegnare l'etichetta
        const labelData = (this.label && this.label !== '') ? [this] : [];

        selection.selectAll("g.handler-label-group")
            .data(labelData)
            .join(
                // ENTER: Crea il gruppo label solo se non esiste
                enter => {
                    const g = enter.append("g")
                        .attr("class", "handler-label-group")
                        .style("cursor", "move");

                    g.append("text")
                        .attr("class", "handler-label-text");

                    // Comportamento Drag dell'etichetta
                    g.call(d3.drag()
                        .on("start", (e) => e.sourceEvent.stopPropagation())
                        .on("drag", (e, d) => {
                            d.labelOffsetX = (d.labelOffsetX || 0) + e.dx;
                            d.labelOffsetY = (d.labelOffsetY || 0) + e.dy;
                            
                            // Richiediamo un render per aggiornare la posizione visiva
                            // Nota: Potremmo aggiornare direttamente il transform qui per performance estrema,
                            // ma usare l'eventBus mantiene il flusso dati pulito.
                            eventBus.emit('RENDER_REQUESTED'); 
                        })
                    );

                    // Inline Editing
                    g.on("dblclick", (e, d) => {
                        e.stopPropagation();
                        startInlineEditing(e, d.label, (val) => {
                            d.label = val;
                            eventBus.emit('RENDER_REQUESTED');
                        });
                    });

                    return g;
                },
                
                // UPDATE: Aggiorna posizione e testo su elementi esistenti
                update => {
                    update.each(function(d) {
                        const g = d3.select(this);
                        
                        // --- LOGICA DI POSIZIONAMENTO ---
                        const position = d.labelPosition || 'left'; 
                        const margin = d.labelMargin !== undefined ? d.labelMargin : CONFIG.handler.label.margin;
                        const r = radius;
                        
                        let labelAnchorX = 0; 
                        let labelAnchorY = 0; 
                        let textAnchor = 'middle'; 
                        let dominantBaseline = 'middle';

                        const diagFactor = 0.707; // sin(45)
                        const r_m = r + margin;
                        const r_m_diag = (r + margin) * diagFactor;

                        switch(position) {
                            case 'top':
                                labelAnchorY = -r_m;
                                dominantBaseline = 'auto'; 
                                break;
                            case 'top-right':
                                labelAnchorX = r_m_diag;
                                labelAnchorY = -r_m_diag;
                                textAnchor = 'start';
                                dominantBaseline = 'auto'; 
                                break;
                            case 'right':
                                labelAnchorX = r_m;
                                textAnchor = 'start';
                                break;
                            case 'bottom-right':
                                labelAnchorX = r_m_diag;
                                labelAnchorY = r_m_diag;
                                textAnchor = 'start';
                                dominantBaseline = 'hanging';
                                break;
                            case 'bottom':
                                labelAnchorY = r_m;
                                dominantBaseline = 'hanging';
                                break;
                            case 'bottom-left':
                                labelAnchorX = -r_m_diag;
                                labelAnchorY = r_m_diag;
                                textAnchor = 'end';
                                dominantBaseline = 'hanging';
                                break;
                            case 'left':
                                labelAnchorX = -r_m;
                                textAnchor = 'end';
                                break;
                            case 'top-left':
                                labelAnchorX = -r_m_diag;
                                labelAnchorY = -r_m_diag;
                                textAnchor = 'end';
                                dominantBaseline = 'auto'; 
                                break;
                            default:
                                labelAnchorX = r + 8;
                                break;
                        }

                        // Calcolo finale con offset manuale (dal drag)
                        const x = labelAnchorX + (d.labelOffsetX || 0);
                        const y = labelAnchorY + (d.labelOffsetY || 0);

                        // Applica trasformazioni
                        g.attr("transform", `translate(${x}, ${y})`);
                        
                        const text = g.select("text")
                            .text(d.label)
                            .attr("text-anchor", textAnchor);

                        if (dominantBaseline === 'auto') {
                            text.attr("dy", "-0.5em");
                        } else {
                            text.attr("dominant-baseline", dominantBaseline);
                        }
                    });
                    return update;
                },
                
                // EXIT: Rimuovi se l'etichetta viene cancellata
                exit => exit.remove()
            );

        // Setup Drag per creare connessioni (dal cerchio dell'handler)
        this.setupDrag(selection);
    }
    
    setupDrag(selection) {
        // Applichiamo il drag listener al gruppo contenitore
        // Nota: d3.drag gestisce internamente la sostituzione dei listener, 
        // quindi richiamarlo non crea duplicati dannosi.
        selection.call(d3.drag()
            .on("start", (event, d) => {
                event.sourceEvent.stopPropagation();
                // Avvia trascinamento Link
                linkInteractionManager.startDrag(d.id, event.sourceEvent, false);
            })
            .on("drag", (event) => {
                // Aggiorna posizione Ghost Link
                linkInteractionManager.updateDrag(event.sourceEvent);
            })
            .on("end", (event, d) => {
                // Finalizza connessione
                linkInteractionManager.endDrag(event, d.id, false);
            })
        );
    }
}