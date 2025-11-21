// render.js - Optimized with proper link caching and helper updates
import { state } from './state.js';
import { calculatePath, calculatePositionAlongPath } from './geometry.js';
import { NodeRenderer } from './NodeRenderer.js';
import { showLinkContextMenu } from './ContextMenu.js';

let nodeRenderer;

/**
 * Initialize renderer
 */
function initRenderer() {
    if (!nodeRenderer) {
        nodeRenderer = new NodeRenderer(render);
    }
}

/**
 * Fast link update without full re-render (for drag operations)
 */
export function updateLinksOnly() {
    const linkLayer = d3.select("g.link-layer");
    if (linkLayer.empty()) return;
    
    // Aggiorna i percorsi visibili e l'area di selezione
    linkLayer.selectAll("path.link").attr("d", d => calculatePath(d));
    linkLayer.selectAll("path.link-hitarea").attr("d", d => calculatePath(d));

    // Aggiorna il ghost link
    linkLayer.selectAll("path.ghost-link").attr("d", d => calculatePath(d));
    
    // Aggiorna la posizione delle label
    const labelLayer = d3.select("g.label-layer");
    if (!labelLayer.empty()) {
        labelLayer.selectAll("g.link-label-group").each(function(d) {
            if (!d.label) return; 

            const pathData = calculatePath(d);
            const basePosition = calculatePositionAlongPath(pathData, d.label.offset);
            
            // Calcola la posizione ASSOLUTA (Base + Offset Drag)
            const absoluteX = basePosition.x + (d.label.offsetX || 0);
            const absoluteY = basePosition.y + (d.label.offsetY || 0);

            // Applica la trasformazione assoluta al gruppo
            d3.select(this).attr("transform", 
                `translate(${absoluteX}, ${absoluteY})`
            );
            
            // NOTA: La dimensione del rettangolo non deve essere aggiornata qui per performance, 
            // ma solo se il testo cambia. Lo facciamo solo in renderLinkLabels.
        });
    }
}

/**
 * Render links
 * @param {d3.Selection} viewport - Viewport selection
 */
function renderLinks(viewport) {
    let linkLayer = viewport.select("g.link-layer");
    
    // Crea il layer se non esiste
    if (linkLayer.empty()) {
        linkLayer = viewport.append("g").attr("class", "link-layer");
    }
    
    // Seleziona i gruppi di link per inserire l'hit-area e il path visibile
    const links = linkLayer.selectAll("g.link-group")
        .data(state.links, d => d.id)
        .join(
            enter => {
                const linkGroup = enter.append("g")
                    .attr("class", d => `link-group ${d.id}`)
                    .classed("selected", d => 
                        state.ui.selectedObject?.type === 'link' && 
                        state.ui.selectedObject?.data?.id === d.id
                    )
                    // Gestione eventi sul gruppo (Hit Area)
                    .on("mousedown", (event) => event.stopPropagation())
                    .on("click", (event, d) => {
                        event.stopPropagation();
                        state.ui.selectedObject = { type: 'link', data: d };
                        if (state.ui.onSelectionChange) {
                            state.ui.onSelectionChange(state.ui.selectedObject);
                        }
                        render();
                    })
                    .on("contextmenu", (d3Event, d) => { // rinominato in d3Event per chiarezza
                        d3Event.preventDefault(); // Previeni il menu contestuale di default del browser
                        d3Event.stopPropagation();
                        // Chiamiamo la funzione di menu con l'evento D3
                        showLinkContextMenu(d3Event, d); 
                    });

                // 2. VISUAL LINK (La linea effettiva)
                linkGroup.append("path")
                    .attr("class", "link")
                    .attr("d", d => calculatePath(d));
                    
                return linkGroup;
            },
            update => {
                update.classed("selected", d => 
                    state.ui.selectedObject?.type === 'link' && 
                    state.ui.selectedObject?.data?.id === d.id
                );
                
                // Aggiorna solo i percorsi senza ricreare gli elementi
                update.selectAll("path.link-hitarea")
                    .attr("d", d => calculatePath(d));
                update.selectAll("path.link")
                    .attr("d", d => calculatePath(d));
                
                return update;
            },
            exit => exit.remove()
        );

    // Gestione del Ghost Link (Lascia questo separato)
    const ghostLinkData = state.ui.ghostLink ? [state.ui.ghostLink] : [];
    
    linkLayer.selectAll("path.ghost-link")
        .data(ghostLinkData)
        .join(
            enter => enter.append("path")
                .attr("class", "ghost-link"),
            update => update.attr("d", d => calculatePath(d)),
            exit => exit.remove()
        );
}

const labelDragBehavior = d3.drag()
    .on("start", (event) => {
        event.sourceEvent.stopPropagation();
        d3.select(event.subject).classed("dragging", true); 
    })
    .on("drag", (event, d) => {
        // 1. Aggiorna solo gli offset (salvati nel dato)
        d.label.offsetX = (d.label.offsetX || 0) + event.dx;
        d.label.offsetY = (d.label.offsetY || 0) + event.dy;
        
        // 2. Ricalcola la posizione assoluta (Base + Offset Drag)
        const pathData = calculatePath(d);
        const basePosition = calculatePositionAlongPath(pathData, d.label.offset);

        const absoluteX = basePosition.x + d.label.offsetX;
        const absoluteY = basePosition.y + d.label.offsetY;

        // 3. Muovi il gruppo alla posizione assoluta
        d3.select(event.subject).attr("transform", `translate(${absoluteX}, ${absoluteY})`);
        
    })
    .on("end", (event) => {
        d3.select(event.subject).classed("dragging", false);
    });

/**
 * Render link labels
 * @param {d3.Selection} viewport - Viewport selection
 */
function renderLinkLabels(viewport) {
    let labelLayer = viewport.select("g.label-layer");
    
    // 1. Prepara il layer se non esiste
    if (labelLayer.empty()) {
        labelLayer = viewport.append("g").attr("class", "label-layer");
    }

    const linksWithLabel = state.links.filter(l => l.label);

    const labels = labelLayer.selectAll("g.link-label-group")
        .data(linksWithLabel, d => d.id)
        .join(
            enter => {
                const group = enter.append("g")
                    .attr("class", "link-label-group")
                    .attr("data-link-id", d => d.id)
                    .call(labelDragBehavior); // Applica il drag

                // Aggiungi background (il posizionamento sarà gestito nel blocco .each())
                group.append("rect")
                    .attr("class", "link-label-bg")
                    .attr("rx", 4)
                    .attr("ry", 4);

                // Aggiungi elemento testo
                group.append("text")
                    .attr("class", "link-label-text")
                    .attr("x", 0) // <-- Posiziona all'origine del gruppo
                    .attr("y", 0) // <-- Posiziona all'origine del gruppo
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .text(d => d.label.text);

                return group;
            },
            update => update,
            exit => exit.remove()
        )
        // Aggiorna tutti i gruppi (Enter + Update)
        .each(function(d) {
            const group = d3.select(this);
            
            // Calcola la posizione base (lungo il path)
            const pathData = calculatePath(d);
            const basePosition = calculatePositionAlongPath(pathData, d.label.offset);
            
            // Calcola la posizione ASSOLUTA (Base + Offset Drag)
            const absoluteX = basePosition.x + (d.label.offsetX || 0);
            const absoluteY = basePosition.y + (d.label.offsetY || 0);
            
            // 1. Trasforma il gruppo alla posizione ASSOLUTA
            group.attr("transform", `translate(${absoluteX}, ${absoluteY})`);
            
            // 2. Aggiorna il testo e misurane la dimensione (posizionato a 0,0)
            const textElement = group.select(".link-label-text")
                .text(d.label.text);

            const textBBox = textElement.node().getBBox();
            
            // 3. Calcola le dimensioni del rettangolo e la sua posizione
            const padding = 10; 
            const rectWidth = textBBox.width + padding;
            const rectHeight = textBBox.height + 6;
            
            // Calcola l'origine (x, y) del rettangolo (alto a sinistra) per centrarlo su 0,0
            const rectX = -(rectWidth / 2); 
            const rectY = -(rectHeight / 2); 
            
            // 4. Aggiorna il rettangolo
            group.select(".link-label-bg")
                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("x", rectX) // <-- Imposta X e Y statiche relative al gruppo
                .attr("y", rectY);
        });
}

/**
 * Main render function
 */
export function render() {
    initRenderer();
    
    const viewport = d3.select("g.viewport");
    if (viewport.empty()) {
        console.warn("Viewport not found");
        return;
    }
    
    // Render nodes
    viewport.select("g.node-layer")
        .selectAll("g.node")
        .data(state.nodes, d => d.id)
        .join(
            enter => {
                const nodeGroup = enter.append("g")
                    .attr("class", d => `node ${d.type}`)
                    .attr("transform", d => `translate(${d.x}, ${d.y})`)
                    .on("click", (event, d) => {
                        event.stopPropagation();
                        state.ui.selectedObject = { type: 'node', data: d };
                        if (state.ui.onSelectionChange) {
                            state.ui.onSelectionChange(state.ui.selectedObject);
                        }
                        render();
                    });
                
                nodeGroup.each(function() {
                    nodeRenderer.render(d3.select(this));
                });
                
                return nodeGroup;
            },
            update => {
                update.attr("transform", d => `translate(${d.x}, ${d.y})`);
                update.classed("selected", d => 
                    state.ui.selectedObject?.type === 'node' && 
                    state.ui.selectedObject?.data?.id === d.id
                );
                update.each(function() {
                    nodeRenderer.update(d3.select(this));
                });
                return update;
            },
            exit => exit.remove()
        );
    
    // Render links
    renderLinks(viewport);
    renderLinkLabels(viewport);
    
    // FIXED: Always render add node helpers after links/nodes update
    // This ensures helpers are refreshed when connections change
    import('./AddNodeHelper.js').then(module => {
        module.renderAddNodeHelpers(viewport);
    });
}