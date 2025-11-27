// src/render.js
import { store } from './state.js';
import { eventBus } from './EventBus.js';
import { calculatePath, calculatePositionAlongPath, findClosestTOnPath } from './geometry.js';
import { NodeRenderer } from './NodeRenderer.js';
import { showLinkContextMenu } from './ContextMenu.js';
import { startInlineEditing } from './InlineEditor.js';

let nodeRenderer;
let rafId = null;

export function initRenderer() {
    if (!nodeRenderer) {
        nodeRenderer = new NodeRenderer(render);
        
        eventBus.on('NODE_CREATED', render);
        eventBus.on('NODE_UPDATED', render);
        eventBus.on('NODE_REMOVED', render);
        eventBus.on('CONNECTION_CREATED', render);
        eventBus.on('CONNECTION_UPDATED', render);
        eventBus.on('CONNECTION_REMOVED', render);
        eventBus.on('GHOST_LINK_UPDATED', renderGhost); // Split ghost render
        eventBus.on('SELECTION_CHANGED', updateSelectionStyles); // Don't full render on selection
    }
}

// Optimization: Separate Ghost Link rendering to avoid touching main DOM
function renderGhost() {
    if (rafId) return; // Drop frame if busy
    rafId = requestAnimationFrame(() => {
        const layer = d3.select("g.link-layer");
        const ghostData = store.state.ui.ghostLink ? [store.state.ui.ghostLink] : [];
        layer.selectAll("path.ghost-link").data(ghostData)
            .join("path").attr("class", "ghost-link").attr("d", d => calculatePath(d));
        rafId = null;
    });
}

function updateSelectionStyles() {
    const s = store.state.ui.selectedObject;
    d3.selectAll(".node").classed("selected", d => s?.type === 'node' && s.id === d.id);
    d3.selectAll(".link-group").classed("selected", d => s?.type === 'link' && s.id === d.id);
}

/**
 * HIGH PERFORMANCE UPDATE
 * If nodeId is provided, only updates links connected to that node.
 * Uses cached adjacency map for O(1) lookup.
 */
export function updateLinksOnly(nodeId = null) {
    const linkLayer = d3.select("g.link-layer");
    const labelLayer = d3.select("g.label-layer");

    // 1. Determine which links to update
    let linksToUpdate;
    if (nodeId) {
        linksToUpdate = store.getLinksForNode(nodeId);
        // Also include ghost link if active
        if(store.state.ui.ghostLink) linksToUpdate.push(store.state.ui.ghostLink);
    } else {
        linksToUpdate = store.links;
    }

    if (linksToUpdate.length === 0) return;

    // 2. Update Paths
    // We use a specific data-selector to find ONLY the DOM elements we need.
    // D3 selectAll is relatively fast, but selecting by ID is faster.
    linksToUpdate.forEach(link => {
        if (!link.id) return; // Ghost link might not have ID yet
        
        // Select specific group
        const group = linkLayer.select(`.link-group[data-id="${link.id}"]`);
        if (!group.empty()) {
            const pathData = calculatePath(link);
            group.select("path.link").attr("d", pathData);
            group.select("path.link-hitarea").attr("d", pathData);
        }

        // 3. Update Label Positions (Fast Projection)
        if (link.label) {
            const labelGroup = labelLayer.select(`.link-label-group[data-id="${link.id}"]`);
            if (!labelGroup.empty()) {
                const pathData = calculatePath(link);
                // CRITICAL OPTIMIZATION:
                // We do NOT recalculate 't' (offset) here. 
                // When a node moves, the label stays at the same relative percentage (t) along the line.
                // We just project x,y from the existing t.
                // This eliminates the expensive findClosestTOnPath loop during node drag.
                
                const pos = calculatePositionAlongPath(link, link.label.offset || 0.5);
                const x = pos.x + (link.label.offsetX || 0);
                const y = pos.y + (link.label.offsetY || 0);
                labelGroup.attr("transform", `translate(${x}, ${y})`);
            }
        }
    });
}

function renderLinks(viewport) {
    let layer = viewport.select("g.link-layer");
    if (layer.empty()) layer = viewport.append("g").attr("class", "link-layer");
    
    // Ghost Link
    const ghostData = store.state.ui.ghostLink ? [store.state.ui.ghostLink] : [];
    layer.selectAll("path.ghost-link").data(ghostData)
        .join("path").attr("class", "ghost-link").attr("d", d => calculatePath(d));

    // === Permanent Links Rendering ===
    const links = store.links;

    const groups = layer.selectAll("g.link-group")
        .data(links, d => d.id);

    const enter = groups.enter()
        .append("g")
        .attr("class", "link-group")
        .attr("data-id", d => d.id);

    enter.append("path")
        .attr("class", "link")
        .attr("d", d => calculatePath(d));

    enter.append("path")
        .attr("class", "link-hitarea")
        .attr("d", d => calculatePath(d))
        .attr("stroke-width", 12)
        .attr("stroke", "transparent")
        .attr("fill", "none");

    // UPDATE
    groups.select("path.link")
        .attr("d", d => calculatePath(d));

    groups.select("path.link-hitarea")
        .attr("d", d => calculatePath(d));

    // EXIT
    groups.exit().remove();

    // Real Links
    layer.selectAll("g.link-group")
        .data(store.links, d => d.id)
        .join(
            enter => {
                const g = enter.append("g")
                    .attr("class", "link-group")
                    .attr("data-id", d => d.id) // Crucial for O(1) DOM selection
                    .on("click", (e, d) => { 
                        e.stopPropagation(); 
                        store.selectObject('link', d); 
                    })
                    .on("contextmenu", (e, d) => showLinkContextMenu(e, d));
                
                g.append("path").attr("class", "link-hitarea")
                   .style("stroke", "transparent").style("stroke-width", 15).style("fill", "none")
                   .attr("d", d => calculatePath(d));
              
                g.append("path").attr("class", "link")
                   .attr("d", d => calculatePath(d));
                return g;
            },
            update => {
                update.attr("data-id", d => d.id);
                update.classed("selected", d => store.state.ui.selectedObject?.id === d.id);
                update.select("path.link").attr("d", d => calculatePath(d));
                update.select("path.link-hitarea").attr("d", d => calculatePath(d));
                return update;
            },
            exit => exit.remove()
        );

}

function renderLinkLabels(viewport) {
    let layer = viewport.select("g.label-layer");
    if (layer.empty()) layer = viewport.append("g").attr("class", "label-layer");
    const labeledLinks = store.links.filter(l => l.label);
    
    layer.selectAll("g.link-label-group")
        .data(labeledLinks, d => d.id)
        .join(
            enter => {
                const g = enter.append("g")
                    .attr("class", "link-label-group")
                    .attr("data-id", d => d.id) // Crucial for fast selection
                    .call(d3.drag()
                        .on("start", function() { d3.select(this).classed("dragging", true); })
                        .on("drag", function(event, d) {
                            // HERE is the only place we need expensive math
                            // When dragging the LABEL itself, we need to re-calculate 't'
                            
                            const absX = event.x; // D3 gives absolute coords for g element drag
                            const absY = event.y;
                            
                            const pathData = calculatePath(d);
                            // Expensive Math: Find closest T based on mouse position
                            const newT = findClosestTOnPath(d, {x: absX, y: absY});
                            
                            d.label.offset = newT;
                            d.label.offsetX = 0; // Reset relative offsets when snapping to line
                            d.label.offsetY = 0;
                            
                            // Visual update immediately
                            const pos = calculatePositionAlongPath(d, newT);
                            d3.select(this).attr("transform", `translate(${pos.x}, ${pos.y})`);
                        })
                        .on("end", function(event, d) { 
                            d3.select(this).classed("dragging", false); 
                            // Persist change to store (and history)
                            store.updateLink(d.id, { label: { ...d.label } });
                        })
                    );
                g.append("rect").attr("class", "link-label-bg");
                g.append("text").attr("class", "link-label-text")
                    .attr("text-anchor", "middle").attr("dy", "0.3em");
                g.on("dblclick", (e, d) => {
                    e.stopPropagation();
                    startInlineEditing(e, d.label.text, (val) => {
                         store.updateLink(d.id, { label: { ...d.label, text: val } });
                    });
                });
                return g;
            },
            update => {
                update.attr("data-id", d => d.id);
                return update;
            },
            exit => exit.remove()
        )
        .each(function(d) {
            const g = d3.select(this);
            const text = g.select("text").text(d.label.text);
            
            // Optimization: Only measure bbox if text changed? 
            // For now, fast enough.
            const bbox = text.node().getBBox();
            const pad = 4;
            g.select("rect")
                .attr("x", bbox.x - pad).attr("y", bbox.y - pad)
                .attr("width", bbox.width + pad*2).attr("height", bbox.height + pad*2);
                
            // Projection
            const pos = calculatePositionAlongPath(d, d.label.offset || 0.5);
            const x = pos.x + (d.label.offsetX || 0);
            const y = pos.y + (d.label.offsetY || 0);
            g.attr("transform", `translate(${x}, ${y})`);
        });
}

export function render() {
    const viewport = d3.select("g.viewport");
    if (viewport.empty()) return;

    // Node Rendering
    viewport.select("g.node-layer").selectAll("g.node")
        .data(store.nodes, d => d.id)
        .join(
            enter => { 
                const g = enter
                    .append("g").attr("class", d => `node ${d.type}`)
                    .attr("transform", d => `translate(${d.position.x}, ${d.position.y})`) 
                    .on("click", (e, d) => { 
                        e.stopPropagation(); store.selectObject('node', d); 
                    }); 
                g.each(function() { 
                    nodeRenderer.render(d3.select(this)); }); 
                    return g; 
            }, 
            update => { 
                update
                    .attr("transform", d => `translate(${d.position.x}, ${d.position.y})`) 
                    .classed("selected", d => store.state.ui.selectedObject?.id === d.id); 
                update.each(function() { 
                    nodeRenderer.update(d3.select(this)); 
                }); 
                return update; 
            },
            exit => exit.remove()
        );

    renderLinks(viewport);
    renderLinkLabels(viewport);
    import('./AddNodeHelper.js').then(m => m.renderAddNodeHelpers(viewport));
}