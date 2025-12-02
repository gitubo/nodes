// src/render.js
import { calculatePath, calculatePositionAlongPath, findClosestTOnPath } from './geometry.js';
import { NodeRenderer } from './NodeRenderer.js';
// import { showLinkContextMenu } from './ContextMenu.js'; // REMOVED
// import { startInlineEditing } from './InlineEditor.js'; // REMOVED

// Module-level state for the renderer
let nodeRenderer;
let rafId = null;
let isDirty = true; // Start dirty for initial render
let isGhostDirty = false;

// Injected dependencies
let svg, store, registry, eventBus;

export function initRenderer(_svg, _store, _registry, _eventBus) {
    if (!nodeRenderer) {
        // Store injected dependencies
        svg = _svg;
        store = _store;
        registry = _registry;
        eventBus = _eventBus;
        
        nodeRenderer = new NodeRenderer(render, registry);
        
        // --- Set up "dirty flag" listeners ---
        eventBus.on('STATE_UPDATED', () => isDirty = true);
        eventBus.on('NODE_CREATED', () => isDirty = true);
        eventBus.on('NODE_UPDATED', () => isDirty = true);
        eventBus.on('NODE_REMOVED', () => isDirty = true);
        eventBus.on('NODE_MOVED', () => isDirty = true); // Final move
        eventBus.on('CONNECTION_CREATED', () => isDirty = true);
        eventBus.on('CONNECTION_UPDATED', () => isDirty = true);
        eventBus.on('CONNECTION_REMOVED', () => isDirty = true);
        eventBus.on('SELECTION_CHANGED', () => isDirty = true); // For selection styles
        eventBus.on('STATE_LOADED', () => isDirty = true);
        
        // Separate listener for high-frequency ghost link
        eventBus.on('GHOST_LINK_UPDATED', () => isGhostDirty = true);
        
        // High-frequency event for node dragging
        eventBus.on('NODE_MOVED_HIGH_FREQ', (node) => {
            // 1. Update Node DOM (Fast)
            d3.select(`.node[data-id="${node.id}"]`)
                .attr("transform", `translate(${node.position.x}, ${node.position.y})`);
            
            // 2. Update Links (Optimized)
            updateLinksOnly(node.id);
            
            // 3. Update AddNodeHelpers (if any)
            const helpers = d3.selectAll(`.add-node-helper[data-node-id='${node.id}']`);
            helpers.attr("transform", function() {
                const hData = d3.select(this).datum();
                if (!hData) return "";
                return `translate(${node.position.x + hData.relX}, ${node.position.y + hData.relY})`;
            });
        });
    }
}

export function startRenderLoop() {
    function loop() {
        if (isDirty) {
            render();
            isDirty = false;
            isGhostDirty = false; // Full render includes ghost
        } else if (isGhostDirty) {
            renderGhost();
            isGhostDirty = false;
        }
        rafId = requestAnimationFrame(loop);
    }
    loop();
}

// Optimization: Separate Ghost Link rendering
function renderGhost() {
    if (!svg) return;
    const layer = svg.select("g.link-layer");
    const ghostData = store.state.ui.ghostLink ? [store.state.ui.ghostLink] : [];
    layer.selectAll("path.ghost-link").data(ghostData)
        .join("path").attr("class", "ghost-link").attr("d", d => calculatePath(d, store.state.nodes, registry));
}

function updateSelectionStyles() {
    if (!svg) return;
    const s = store.state.ui.selectedObject;
    svg.selectAll(".node").classed("selected", d => s?.type === 'node' && s.id === d.id);
    svg.selectAll(".link-group").classed("selected", d => s?.type === 'link' && s.id === d.id);
}

/**
 * HIGH PERFORMANCE UPDATE
 * If nodeId is provided, only updates links connected to that node.
 */
export function updateLinksOnly(nodeId = null) {
    if (!svg) return;
    const linkLayer = svg.select("g.link-layer");
    const labelLayer = svg.select("g.label-layer");

    // 1. Determine which links to update
    let linksToUpdate;
    if (nodeId) {
        linksToUpdate = store.getLinksForNode(nodeId);
        if(store.state.ui.ghostLink) linksToUpdate.push(store.state.ui.ghostLink);
    } else {
        linksToUpdate = store.links;
    }

    if (linksToUpdate.length === 0) return;

    // 2. Update Paths
    linksToUpdate.forEach(link => {
        if (!link.id && !link.sourceHandlerId) return; // Skip invalid
        
        const id = link.id || 'ghost';
        if (id === 'ghost') {
            renderGhost(); // Just re-render ghost
            return;
        }

        const group = linkLayer.select(`.link-group[data-id="${link.id}"]`);
        if (!group.empty()) {
            const pathData = calculatePath(link, store.state.nodes, registry);
            group.select("path.link").attr("d", pathData);
            group.select("path.link-hitarea").attr("d", pathData);
        }

        // 3. Update Label Positions (Fast Projection)
        if (link.label) {
            const labelGroup = labelLayer.select(`.link-label-group[data-id="${link.id}"]`);
            if (!labelGroup.empty()) {
                const pos = calculatePositionAlongPath(link, link.label.offset || 0.5, store.state.nodes, registry);
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
    renderGhost();

    // Real Links
    layer.selectAll("g.link-group")
        .data(store.links, d => d.id)
        .join(
            enter => {
                const g = enter.append("g")
                    .attr("class", "link-group")
                    .attr("data-id", d => d.id);
                    // REMOVED: .on("click", ...)
                    // REMOVED: .on("contextmenu", ...)
                
                g.append("path").attr("class", "link-hitarea")
                   .style("stroke", "transparent").style("stroke-width", 15).style("fill", "none")
                   .attr("d", d => calculatePath(d, store.state.nodes, registry));
              
                g.append("path").attr("class", "link")
                   .attr("d", d => calculatePath(d, store.state.nodes, registry));
                return g;
            },
            update => {
                update.attr("data-id", d => d.id);
                update.select("path.link").attr("d", d => calculatePath(d, store.state.nodes, registry));
                update.select("path.link-hitarea").attr("d", d => calculatePath(d, store.state.nodes, registry));
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
                    .attr("data-id", d => d.id);
                    
                g.append("rect").attr("class", "link-label-bg");
                g.append("text").attr("class", "link-label-text")
                    .attr("text-anchor", "middle").attr("dy", "0.3em");
                    
                return g;
            },
            update => {
                update.attr("data-id", d => d.id);
                return update;
            },
            exit => exit.remove()
        )
        .each(function(d) {
            // This 'each' block updates positions and text
            const g = d3.select(this);
            const text = g.select("text").text(d.label.text);
            
            const bbox = text.node().getBBox();
            const pad = 6;
            g.select("rect")
                .attr("x", bbox.x - pad)
                .attr("y", bbox.y - pad)
                .attr("width", bbox.width + pad*2)
                .attr("height", bbox.height + pad*2);
                 
            // Projection
            const pos = calculatePositionAlongPath(d, d.label.offset || 0.5, store.state.nodes, registry);
            const x = pos.x + (d.label.offsetX || 0);
            const y = pos.y + (d.label.offsetY || 0);
            g.attr("transform", `translate(${x}, ${y})`);
        });
}

export function render() {
    if (!svg) return;
    const viewport = svg.select("g.viewport");
    if (viewport.empty()) return;

    // 1. Update Selection Styles
    updateSelectionStyles();

    // 2. Node Rendering
    viewport.select("g.node-layer").selectAll("g.node")
        .data(store.nodes, d => d.id)
        .join(
            enter => { 
                const g = enter
                    .append("g")
                    .attr("class", d => `node ${d.type}`)
                    .attr("data-id", d => d.id) // Add data-id for InputSystem
                    .attr("transform", d => `translate(${d.position.x}, ${d.position.y})`);
                    // REMOVED: .on("click", ...)
                    
                g.each(function(d) { 
                    nodeRenderer.render(d3.select(this), d);
                }); 
                return g; 
            }, 
            update => { 
                update
                    .attr("transform", d => `translate(${d.position.x}, ${d.position.y})`);
                
                update.each(function(d) { 
                    nodeRenderer.update(d3.select(this), d); 
                });
                return update; 
            },
            exit => exit.remove()
        );

    // 3. Link Rendering
    renderLinks(viewport);
    renderLinkLabels(viewport);
    
    // 4. Helper Rendering
    // TODO: This still uses a singleton `store` and `eventBus`.
    // It should be refactored into its own class and instantiated in Widget.js.
    //import('./AddNodeHelper.js').then(m => m.renderAddNodeHelpers(viewport));
}