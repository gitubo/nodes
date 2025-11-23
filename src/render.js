// src/render.js
import { store } from './state.js';
import { eventBus } from './EventBus.js';
import { calculatePath, calculatePositionAlongPath } from './geometry.js';
import { NodeRenderer } from './NodeRenderer.js';
import { showLinkContextMenu } from './ContextMenu.js';
import { startInlineEditing } from './InlineEditor.js';

let nodeRenderer;

export function initRenderer() {
    if (!nodeRenderer) {
        nodeRenderer = new NodeRenderer(render);
        
        // Subscribe to granular events
        eventBus.on('NODE_CREATED', render);
        eventBus.on('NODE_UPDATED', render);
        eventBus.on('NODE_REMOVED', render);
        eventBus.on('CONNECTION_CREATED', render);
        eventBus.on('CONNECTION_UPDATED', render);
        eventBus.on('CONNECTION_REMOVED', render);
        eventBus.on('GHOST_LINK_UPDATED', render);
        eventBus.on('SELECTION_CHANGED', render);
    }
}

function findClosestTOnPath(pathString, targetPoint, samples = 40) {
    const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tempPath.setAttribute("d", pathString);
    const totalLen = tempPath.getTotalLength();
    
    let bestT = 0.5;
    let minDst = Infinity;
    for(let i=0; i<=samples; i++) {
        const t = i/samples;
        const p = tempPath.getPointAtLength(totalLen * t);
        const dst = (p.x - targetPoint.x)**2 + (p.y - targetPoint.y)**2;
        if(dst < minDst) {
            minDst = dst;
            bestT = t;
        }
    }
    return bestT;
}

export function updateLinksOnly() {
    const linkLayer = d3.select("g.link-layer");
    const labelLayer = d3.select("g.label-layer");

    if (!linkLayer.empty()) {
        linkLayer.selectAll("path.link").attr("d", d => calculatePath(d));
        linkLayer.selectAll("path.link-hitarea").attr("d", d => calculatePath(d));
        linkLayer.selectAll("path.ghost-link").attr("d", d => calculatePath(d));
    }
    
    if (!labelLayer.empty()) {
        labelLayer.selectAll("g.link-label-group").each(function(d) {
            if (!d.label) return;
            const oldPath = d3.select(`.link-group.${d.id} path.link`).attr("d");
            if(!oldPath) return; 

            const currentPos = calculatePositionAlongPath(oldPath, d.label.offset || 0.5);
            const currentAbsX = currentPos.x + (d.label.offsetX || 0);
            const currentAbsY = currentPos.y + (d.label.offsetY || 0);

            const newPathData = calculatePath(d);
            const newT = findClosestTOnPath(newPathData, {x: currentAbsX, y: currentAbsY});
            d.label.offset = newT;
            d.label.offsetX = 0;
            d.label.offsetY = 0; 

            const newPosOnLine = calculatePositionAlongPath(newPathData, newT);
            d3.select(this).attr("transform", `translate(${newPosOnLine.x}, ${newPosOnLine.y})`);
            d3.select(this).select("text").text(d.label.text);
        });
    }
}

function renderLinks(viewport) {
    let layer = viewport.select("g.link-layer");
    if (layer.empty()) layer = viewport.append("g").attr("class", "link-layer");
    const ghostData = store.state.ui.ghostLink ? [store.state.ui.ghostLink] : [];
    
    layer.selectAll("path.ghost-link").data(ghostData)
        .join("path").attr("class", "ghost-link").attr("d", d => calculatePath(d));

    layer.selectAll("g.link-group")
        .data(store.links, d => d.id)
        .join(
            enter => {
                const g = enter.append("g").attr("class", d => `link-group ${d.id}`)
                    .on("click", (e, d) => { e.stopPropagation(); store.selectObject('link', d); })
                    .on("contextmenu", (e, d) => showLinkContextMenu(e, d));
                
                g.append("path").attr("class", "link-hitarea")
                   .style("stroke", "transparent").style("stroke-width", 15).style("fill", "none")
                   .attr("d", d => calculatePath(d));
              
                g.append("path").attr("class", "link")
                   .attr("d", d => calculatePath(d));
                return g;
            },
            update => {
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
                const g = enter.append("g").attr("class", "link-label-group")
                    .call(d3.drag()
                        .on("start", function() { d3.select(this).classed("dragging", true); })
                        .on("drag", function(event, d) {
                            d.label.offsetX = (d.label.offsetX || 0) + event.dx;
                            d.label.offsetY = (d.label.offsetY || 0) + event.dy;
                             const pathData = calculatePath(d);
                             const pos = calculatePositionAlongPath(pathData, d.label.offset || 0.5);
                             d3.select(this).attr("transform", `translate(${pos.x + d.label.offsetX}, ${pos.y + d.label.offsetY})`);
                        })
                        .on("end", function() { d3.select(this).classed("dragging", false); })
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
            update => update,
            exit => exit.remove()
        )
        .each(function(d) {
            const g = d3.select(this);
            const text = g.select("text").text(d.label.text);
            const bbox = text.node().getBBox();
            const pad = 4;
            g.select("rect")
                .attr("x", bbox.x - pad).attr("y", bbox.y - pad)
                .attr("width", bbox.width + pad*2).attr("height", bbox.height + pad*2);
                
            const pathData = calculatePath(d);
            const pos = calculatePositionAlongPath(pathData, d.label.offset || 0.5);
            const x = pos.x + (d.label.offsetX || 0);
            const y = pos.y + (d.label.offsetY || 0);
            g.attr("transform", `translate(${x}, ${y})`);
        });
}

export function render() {
    const viewport = d3.select("g.viewport");
    if (viewport.empty()) return;

    viewport.select("g.node-layer").selectAll("g.node")
        .data(store.nodes, d => d.id)
        .join(
            enter => {
                const g = enter.append("g").attr("class", d => `node ${d.type}`)
                    .attr("transform", d => `translate(${d.x}, ${d.y})`)
                    .on("click", (e, d) => { e.stopPropagation(); store.selectObject('node', d); });
                g.each(function() { nodeRenderer.render(d3.select(this)); });
                return g;
            },
            update => {
                update.attr("transform", d => `translate(${d.x}, ${d.y})`)
                    .classed("selected", d => store.state.ui.selectedObject?.id === d.id);
                update.each(function() { nodeRenderer.update(d3.select(this)); });
                return update;
            },
            exit => exit.remove()
        );

    renderLinks(viewport);
    renderLinkLabels(viewport);
    import('./AddNodeHelper.js').then(m => m.renderAddNodeHelpers(viewport));
}