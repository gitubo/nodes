import { registry } from './Registry.js';
import { store } from './state.js';
import { eventBus } from './EventBus.js';

const HELPER_CONFIG = {
    size: 24, 
    linkLength: 40, 
    plusSize: 12,
    plusStrokeWidth: 2, 
    hoverScale: 1.1, // CHANGED: Scale to 1.1
    menuItemHeight: 36, 
    menuWidth: 180
};

export function renderAddNodeHelpers(viewport) {
    const helpers = [];
    store.nodes.forEach(node => {
        node.handlers.forEach(handler => {
            if (handler.type === 'source') {
                const isConnected = store.links.some(link => String(link.source) === String(handler.id));
                if (!isConnected) {
                    helpers.push({
                        id: `helper_${handler.id}`,
                        handlerId: handler.id,
                        nodeId: node.id,
                        x: node.x + (handler.offset_x || 0),
                        y: node.y + (handler.offset_y || 0)
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
                    .attr("transform", d => `translate(${d.x}, ${d.y})`);
                g.each(function() { renderHelper(d3.select(this)); });
                return g;
            },
            update => update.attr("transform", d => `translate(${d.x}, ${d.y})`),
            exit => exit.remove()
        );
}

function renderHelper(group) {
    const cfg = HELPER_CONFIG;
    const data = group.datum();
    
    // Link Line (Dashed via CSS .helper-link)
    group.append("line").attr("class", "helper-link")
        .attr("x1", 0).attr("y1", 0).attr("x2", cfg.linkLength).attr("y2", 0);
    
    const btn = group.append("g").attr("class", "helper-button")
        .attr("transform", `translate(${cfg.linkLength}, 0)`);
    
    // Box
    btn.append("rect").attr("class", "helper-box")
        .attr("x", -cfg.size/2).attr("y", -cfg.size/2)
        .attr("width", cfg.size).attr("height", cfg.size).attr("rx", 4);
        
    // Plus Sign - Ensure it's on top and styling is correct
    btn.append("path").attr("class", "helper-plus")
        .attr("d", "M -6 0 L 6 0 M 0 -6 L 0 6")
        .attr("stroke-width", cfg.plusStrokeWidth);
    
    // Interactions
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
                const sourceNode = store.nodes.find(n => n.id === data.nodeId);
                if (!sourceNode) return;
                
                const newNode = store.addNode(type, data.x + 150, data.y - 30);
                const targetHandler = newNode.handlers.find(h => h.type === 'target');
                if (targetHandler) {
                    store.addLink(data.handlerId, targetHandler.id);
                }
            });
        });
}

export function showNodeTypeMenu(position, filterFn, onSelect) {
    d3.selectAll(".node-type-menu").remove();
    
    const types = [];
    registry.getNodeTypes().forEach(type => {
        const def = registry.getNodeDefinition(type);
        if (!filterFn || filterFn(def)) {
            types.push({ type, label: type.charAt(0).toUpperCase() + type.slice(1) });
        }
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

// INTERNAL: Not exported, triggered by EventBus
function updateAddNodeHelpers() {
    const viewport = d3.select("g.viewport");
    const helperLayer = viewport.select("g.helper-layer");
    
    if (helperLayer.empty()) return;
    
    helperLayer.selectAll("g.add-node-helper").each(function(d) {
        const node = store.nodes.find(n => n.id === d.nodeId);
        if (!node) return;
        
        const handler = node.handlers.find(h => h.id === d.handlerId);
        if (!handler) return;
        
        d.x = node.x + (handler.offset_x || 0);
        d.y = node.y + (handler.offset_y || 0);
        
        d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
    });
}

eventBus.on('NODE_MOVED', updateAddNodeHelpers);