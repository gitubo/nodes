// src/AddNodeHelper.js
import { registry } from './Registry.js';
import { store } from './state.js';
import { eventBus } from './EventBus.js';

const HELPER_CONFIG = {
    size: 24, linkLength: 40, plusSize: 12, plusStrokeWidth: 2, 
    hoverScale: 1.1, menuItemHeight: 36, menuWidth: 180
};

export function renderAddNodeHelpers(viewport) {
    const helpers = [];
    store.nodes.forEach(node => {
        node.handlers.forEach(handler => {
            if (handler.type === 'source') {
                const isConnected = store.links.some(link => String(link.source) === String(handler.id));
                if (!isConnected) {
                    const offsetX = handler.offset_x || 0;
                    const offsetY = handler.offset_y || 0;
                    helpers.push({
                        id: `helper_${handler.id}`,
                        handlerId: handler.id,
                        nodeId: node.id,
                        x: node.x + offsetX,
                        y: node.y + offsetY,
                        // Crucial for drag synchronization
                        relX: offsetX, 
                        relY: offsetY
                    });
                }
            }
        });
    });

    let helperLayer = viewport.select("g.helper-layer");
    if (helperLayer.empty()) helperLayer = viewport.append("g").attr("class", "helper-layer");

    helperLayer.selectAll("g.add-node-helper")
        .data(helpers, d => d.handlerId)
        .join(
            enter => {
                const g = enter.append("g").attr("class", "add-node-helper")
                    // Attribute used by NodeRenderer to find specific helpers
                    .attr("data-node-id", d => d.nodeId)
                    .attr("transform", d => `translate(${d.x}, ${d.y})`);
                g.each(function() { renderHelper(d3.select(this)); });
                return g;
            },
            update => update
                .attr("data-node-id", d => d.nodeId) // Ensure ID persists
                .attr("transform", d => `translate(${d.x}, ${d.y})`),
            exit => exit.remove()
        );
}

function renderHelper(group) {
    const cfg = HELPER_CONFIG;
    const data = group.datum();

    group.append("line").attr("class", "helper-link")
        .attr("x1", 0).attr("y1", 0).attr("x2", cfg.linkLength).attr("y2", 0);

    const btn = group.append("g").attr("class", "helper-button")
        .attr("transform", `translate(${cfg.linkLength}, 0)`);

    btn.append("rect").attr("class", "helper-box")
        .attr("x", -cfg.size/2).attr("y", -cfg.size/2)
        .attr("width", cfg.size).attr("height", cfg.size).attr("rx", 4);

    btn.append("path").attr("class", "helper-plus")
        .attr("d", "M -6 0 L 6 0 M 0 -6 L 0 6")
        .attr("stroke-width", cfg.plusStrokeWidth);

    btn.on("mouseenter", function() {
            d3.select(this).transition().duration(150)
                .attr("transform", `translate(${cfg.linkLength}, 0) scale(${cfg.hoverScale})`);
        })
        .on("mouseleave", function() {
            d3.select(this).transition().duration(150)
                .attr("transform", `translate(${cfg.linkLength}, 0) scale(1)`);
        })
        .on("click", function(event) {
            event.stopPropagation();
            const [mx, my] = d3.pointer(event, d3.select("svg").node());
            const filter = (def) => def.getHandlers().some(h => h.type === 'target');
            showNodeTypeMenu({x: mx, y: my}, filter, (type) => {
                const newNode = store.addNode(type, data.x + 150, data.y - 30);
                if (newNode) {
                    const targetHandler = newNode.handlers.find(h => h.type === 'target');
                    if (targetHandler) {
                        store.addLink(data.handlerId, targetHandler.id);
                    }
                }
            });
        });
}

export function showNodeTypeMenu(position, filterFn, onSelect) {
    d3.selectAll(".node-type-menu").remove();
    const types = [];
    registry.getNodeTypes().forEach(type => {
        const def = registry.getNodeDefinition(type);
        if (!filterFn || filterFn(def)) types.push({ type, label: type.charAt(0).toUpperCase() + type.slice(1) });
    });
    if (types.length === 0) return;
    
    const menu = d3.select("svg").append("g").attr("class", "node-type-menu")
        .attr("transform", `translate(${position.x + 10}, ${position.y})`);

    const h = types.length * HELPER_CONFIG.menuItemHeight;
    menu.append("rect").attr("class", "menu-background")
        .attr("width", HELPER_CONFIG.menuWidth).attr("height", h).attr("rx", 6);

    types.forEach((t, i) => {
        const g = menu.append("g").attr("class", "menu-item")
            .attr("transform", `translate(0, ${i * HELPER_CONFIG.menuItemHeight})`)
            .on("click", function(e) {
                e.stopPropagation();
                onSelect(t.type);
                d3.selectAll(".node-type-menu").remove();
            });
        g.append("rect").attr("class", "menu-item-bg")
            .attr("width", HELPER_CONFIG.menuWidth).attr("height", HELPER_CONFIG.menuItemHeight);
        g.append("text").attr("class", "menu-item-text")
            .attr("x", 16).attr("y", HELPER_CONFIG.menuItemHeight/2)
            .attr("dominant-baseline", "middle").text(t.label);
        g.on("mouseenter", function() { d3.select(this).select("rect").classed("menu-item-hover", true); });
        g.on("mouseleave", function() { d3.select(this).select("rect").classed("menu-item-hover", false); });
    });
    d3.select("svg").on("click.menu", () => d3.selectAll(".node-type-menu").remove());
}

function updateAddNodeHelpers() {
    const viewport = d3.select("g.viewport");
    renderAddNodeHelpers(viewport); 
}

// Update helpers when topology changes or node settles
eventBus.on('NODE_CREATED', updateAddNodeHelpers);
eventBus.on('NODE_UPDATED', updateAddNodeHelpers); 
eventBus.on('NODE_REMOVED', updateAddNodeHelpers);
eventBus.on('CONNECTION_CREATED', updateAddNodeHelpers);
eventBus.on('CONNECTION_REMOVED', updateAddNodeHelpers);
eventBus.on('NODE_MOVED', updateAddNodeHelpers); // Snap update