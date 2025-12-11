// src/render.js
import { calculatePath, calculatePositionAlongPath } from './geometry.js';
import { NodeRenderer } from './NodeRenderer.js';

let nodeRenderer;
let rafId = null;
let isDirty = true;
let isGhostDirty = false;

let svg, store, registry, eventBus;

export function initRenderer(_svg, _store, _registry, _eventBus) {
    if (!nodeRenderer) {
        svg = _svg;
        store = _store;
        registry = _registry;
        eventBus = _eventBus;
        
        // CHANGED: Pass store to NodeRenderer
        nodeRenderer = new NodeRenderer(render, registry, store); 

        eventBus.on('STATE_UPDATED', () => isDirty = true);
        eventBus.on('NODE_CREATED', () => isDirty = true);
        eventBus.on('NODE_UPDATED', () => isDirty = true);
        eventBus.on('NODE_REMOVED', () => isDirty = true);
        eventBus.on('NODE_MOVED', () => isDirty = true);
        eventBus.on('CONNECTION_CREATED', () => isDirty = true);
        eventBus.on('CONNECTION_UPDATED', () => isDirty = true);
        eventBus.on('CONNECTION_REMOVED', () => isDirty = true);
        eventBus.on('SELECTION_CHANGED', () => isDirty = true);
        eventBus.on('STATE_LOADED', () => isDirty = true);
        eventBus.on('GHOST_CONNECTION_UPDATED', () => isGhostDirty = true);
        eventBus.on('NODE_MOVED_HIGH_FREQ', (node) => {
            d3.select(`.node[data-id="${node.id}"]`)
                .attr("transform", `translate(${node.position.x}, ${node.position.y})`);
            updateLinksOnly(node.id);
        });
        eventBus.on('LABEL_DRAGGED', (linkId) => { updateLabelVisuals(linkId); });
    }
}

function updateLabelVisuals(linkId) {
    const link = store.getLink(linkId);
    if (!link || !link.label) return;

    const labelGroup = svg.select(`.link-label-group[data-id="${link.id}"]`);
    if (labelGroup.empty()) return;

    // Use ONLY the offset float. Default to 0.5 (middle) if undefined.
    const pos = calculatePositionAlongPath(link, link.label.offset ?? 0.5, store.state.nodes, registry);
    
    // No offsetX/Y addition here
    labelGroup.attr("transform", `translate(${pos.x}, ${pos.y})`);
}

export function startRenderLoop() {
    function loop() {
        if (isDirty) {
            render();
            isDirty = false;
            isGhostDirty = false; 
        } else if (isGhostDirty) {
            renderGhost();
            isGhostDirty = false;
        }
        rafId = requestAnimationFrame(loop);
    }
    loop();
}

function renderGhost() {
    if (!svg) return;
    const layer = svg.select("g.link-layer");
    
    // OLD: const ghostData = store.state.ui.ghostLink ? [store.state.ui.ghostLink] : [];
    // NEW: Access via transient uiState
    const ghostData = store.uiState.ghostLink ? [store.uiState.ghostLink] : [];

    layer.selectAll("path.ghost-link").data(ghostData)
        .join("path")
        .attr("class", "ghost-link")
        .attr("d", d => calculatePath(d, store.state.nodes, registry));
}

function updateSelectionStyles() {
    if (!svg) return;
    
    // OLD: const s = store.state.ui.selectedObject;
    // NEW: Access via the SelectionManager
    const s = store.selection.getSelected(); 
    
    // The rest of the logic remains the same
    svg.selectAll(".node").classed("selected", d => s?.type === 'node' && s.id === d.id);
    svg.selectAll(".link-group").classed("selected", d => s?.type === 'link' && s.id === d.id);
}

export function updateLinksOnly(nodeId = null) {
    if (!svg) return;
    const linkLayer = svg.select("g.link-layer");
    const labelLayer = svg.select("g.label-layer");
    
    let linksToUpdate;
    if (nodeId) {
        linksToUpdate = store.getLinksForNode(nodeId); 
        if(store.uiState.ghostLink) linksToUpdate.push(store.uiState.ghostLink);
    } else {
        linksToUpdate = store.links;
    }

    if (linksToUpdate.length === 0) return;

    linksToUpdate.forEach(link => {
        if (!link.id && !link.sourceHandlerId) return; 
        
        const id = link.id || 'ghost';
        if (id === 'ghost') {
            renderGhost(); 
            return;
        }

        const group = linkLayer.select(`.link-group[data-id="${link.id}"]`);
        if (!group.empty()) {
            const pathData = calculatePath(link, store.state.nodes, registry);
            group.select("path.link").attr("d", pathData);
            group.select("path.link-hitarea").attr("d", pathData);
        }

        if (link.label) {
            const labelGroup = labelLayer.select(`.link-label-group[data-id="${link.id}"]`);
            if (!labelGroup.empty()) {
                const pos = calculatePositionAlongPath(link, link.label.offset ?? 0.5, store.state.nodes, registry);
                labelGroup.attr("transform", `translate(${pos.x}, ${pos.y})`);
            }
        }
    });
}

function renderLinks(viewport) {
    let layer = viewport.select("g.link-layer");
    if (layer.empty()) layer = viewport.append("g").attr("class", "link-layer");
    
    renderGhost(); // existing
    
    layer.selectAll("g.link-group")
        .data(store.links, d => d.id)
        .join(
            enter => {
                const g = enter.append("g")
                    .attr("class", "link-group")
                    .attr("data-id", d => d.id);
                
                // Hit area (invisible, thick)
                g.append("path").attr("class", "link-hitarea")
                    .style("stroke", "transparent").style("stroke-width", 15).style("fill", "none")
                    .attr("d", d => calculatePath(d, store.state.nodes, registry));
                
                // Visual Link
                g.append("path").attr("class", "link")
                    .attr("d", d => calculatePath(d, store.state.nodes, registry))
                    // Apply Dynamic Styles
                    .style("stroke", d => d.style?.stroke || 'var(--dim-gray)')
                    .style("stroke-width", d => d.style?.strokeWidth || 2);

                 return g;
            },
            update => {
                update.attr("data-id", d => d.id);
                const linkPath = update.select("path.link");
                
                linkPath.attr("d", d => calculatePath(d, store.state.nodes, registry))
                    // Update Dynamic Styles
                    .style("stroke", d => d.style?.stroke || 'var(--dim-gray)')
                    .style("stroke-width", d => d.style?.strokeWidth || 2);
                    
                update.select("path.link-hitarea").attr("d", d => calculatePath(d, store.state.nodes, registry));
                return update;
            },
            exit => exit.remove()
        );
}

function renderLinkLabels(viewport) {
    let layer = viewport.select("g.label-layer");
    if (layer.empty()) layer = viewport.append("g").attr("class", "label-layer");
    const labeledLinks = store.links.filter(l => 
        l.label && 
        typeof l.label.text === 'string' && 
        l.label.text.trim() !== ''
    );
    
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
            const g = d3.select(this);
            const text = g.select("text")
                .text(d.label.text)
                .style("fill", d.label.color || '#606265')
                .style("font-size", (d.label.fontSize || 20) + "px");
            const bbox = text.node().getBBox();
            const pad = 6;
            g.select("rect")
                .attr("x", bbox.x - pad)
                .attr("y", bbox.y - pad)
                .attr("width", bbox.width + pad*2)
                .attr("height", bbox.height + pad*2)
                .style("fill", d.label.bgColor || '#f8fbff');
            const pos = calculatePositionAlongPath(d, d.label.offset ?? 0.5, store.state.nodes, registry);
            g.attr("transform", `translate(${pos.x}, ${pos.y})`);
        });
}

export function render() {
    if (!svg) return;
    const viewport = svg.select("g.viewport");
    if (viewport.empty()) return;

    updateSelectionStyles();

    viewport.select("g.node-layer").selectAll("g.node")
        .data(store.nodes, d => d.id)
        .join(
            enter => { 
                const g = enter
                    .append("g")
                    .attr("class", d => `node ${d.type}`)
                    .attr("data-id", d => d.id) 
                    .attr("transform", d => `translate(${d.position.x}, ${d.position.y})`);
                
                g.each(function(d) { 
                    nodeRenderer.render(d3.select(this), d);
                }); 
                return g; 
            }, 
            update => { 
                update.attr("transform", d => `translate(${d.position.x}, ${d.position.y})`);
                update.each(function(d) { 
                    nodeRenderer.update(d3.select(this), d); 
                });
                return update;
            },
            exit => exit.remove()
        );

    renderLinks(viewport);
    renderLinkLabels(viewport);    
}