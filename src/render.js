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
        eventBus.on('GHOST_LINK_UPDATED', () => isGhostDirty = true);

        eventBus.on('NODE_MOVED_HIGH_FREQ', (node) => {
            d3.select(`.node[data-id="${node.id}"]`)
                .attr("transform", `translate(${node.position.x}, ${node.position.y})`);
            updateLinksOnly(node.id);
        });

        eventBus.on('LABEL_DRAGGED', (linkId) => {
            updateLabelVisuals(linkId);
        });
    }
}

function updateLabelVisuals(linkId) {
    const link = store.getLink(linkId);
    if (!link || !link.label) return;

    // Select only the specific label group
    const labelGroup = svg.select(`.link-label-group[data-id="${link.id}"]`);
    if (labelGroup.empty()) return;

    // Calculate only the new position (Geometry only, no DOM reads)
    const pos = calculatePositionAlongPath(link, link.label.offset || 0.5, store.state.nodes, registry);
    const x = pos.x + (link.label.offsetX || 0);
    const y = pos.y + (link.label.offsetY || 0);

    // Direct DOM update
    labelGroup.attr("transform", `translate(${x}, ${y})`);
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

export function updateLinksOnly(nodeId = null) {
    if (!svg) return;
    const linkLayer = svg.select("g.link-layer");
    const labelLayer = svg.select("g.label-layer");
    let linksToUpdate;
    if (nodeId) {
        linksToUpdate = store.getLinksForNode(nodeId);
        if(store.state.ui.ghostLink) linksToUpdate.push(store.state.ui.ghostLink);
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
    
    renderGhost();

    layer.selectAll("g.link-group")
        .data(store.links, d => d.id)
        .join(
            enter => {
                const g = enter.append("g")
                    .attr("class", "link-group")
                    .attr("data-id", d => d.id);
                
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
            const g = d3.select(this);
            const text = g.select("text").text(d.label.text);
            const bbox = text.node().getBBox();
            const pad = 6;
            g.select("rect")
                .attr("x", bbox.x - pad)
                .attr("y", bbox.y - pad)
                .attr("width", bbox.width + pad*2)
                .attr("height", bbox.height + pad*2);
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