// render.js - Optimized with proper link caching
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
 * Fast link update without full re-render (for drag operations)
 */
export function updateLinksOnly() {
    const linkLayer = d3.select("g.link-layer");
    if (linkLayer.empty()) return;
    
    // Update all links (fast path calculation)
    linkLayer.selectAll("path.link")
        .attr("d", d => calculatePath(d));
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
                .attr("d", d => calculatePath(d))
                .on("mousedown", (event) => event.stopPropagation())
                .on("click", (event, d) => {
                    event.stopPropagation();
                    state.ui.selectedObject = { type: 'link', data: d };
                    if (state.ui.onSelectionChange) {
                        state.ui.onSelectionChange(state.ui.selectedObject);
                    }
                    render();
                })
                .on("contextmenu", function(event, d) {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Context menu per link
                    import('./ContextMenu.js').then(module => {
                        module.showLinkContextMenu(event, d);
                    });
                }),
            update => update
                .attr("d", d => calculatePath(d))
                .classed("selected", d => 
                    state.ui.selectedObject?.type === 'link' && 
                    state.ui.selectedObject?.data?.id === d.id
                ),
            exit => exit.remove()
        );
    
    // Ghost link
    linkLayer.selectAll("path.ghost-link")
        .data(state.ui.ghostLink ? [state.ui.ghostLink] : [], d => d.sourceId)
        .join(
            enter => enter.append("path")
                .attr("class", "ghost-link")
                .attr("d", d => calculatePath(d)),
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
    
    // Render add node helpers - AGGIUNGI QUESTA PARTE
    import('./AddNodeHelper.js').then(module => {
        module.renderAddNodeHelpers(viewport);
    });
}