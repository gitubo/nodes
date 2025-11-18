// render.js
import { state } from './state.js';
import { calculatePath } from './geometry.js';
import { NodeRenderer } from './NodeRenderer.js';
import { CONFIG } from './config.js';

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
 * Render links
 * @param {d3.Selection} viewport - Viewport selection
 */
function renderLinks(viewport) {
    const linkLayer = viewport.select("g.link-layer");
    
    // Permanent links
    linkLayer.selectAll("path.link")
        .data(state.links, d => d.id)
        .join(
            enter => enter.append("path")
                .attr("class", "link")
                .on("mousedown", (event) => event.stopPropagation()),
            update => update.attr("d", d => calculatePath(d)),
            exit => exit.remove()
        );
    
    // Ghost link
    linkLayer.selectAll("path.ghost-link")
        .data(state.ui.ghostLink ? [state.ui.ghostLink] : [], d => d.sourceId)
        .join(
            enter => enter.append("path").attr("class", "ghost-link"),
            update => update.attr("d", d => calculatePath(d)),
            exit => exit.remove()
        );
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
                    .attr("transform", d => `translate(${d.x}, ${d.y})`);
                
                nodeGroup.each(function() {
                    nodeRenderer.render(d3.select(this));
                });
                
                return nodeGroup;
            },
            update => {
                update.attr("transform", d => `translate(${d.x}, ${d.y})`);
                update.each(function() {
                    nodeRenderer.update(d3.select(this));
                });
                return update;
            },
            exit => exit.remove()
        );
    
    // Render links
    renderLinks(viewport);
}