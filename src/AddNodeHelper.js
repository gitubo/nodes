// AddNodeHelper.js - Fixed helper for adding new nodes from SOURCE handlers
import { registry } from './Registry.js';
import { state } from './state.js';
import { render } from './render.js';
import { createNode } from './state.js';

// Configurazione parametrica
const HELPER_CONFIG = {
    size: 24,
    linkLength: 40,
    plusSize: 12,
    plusStrokeWidth: 2,
    hoverScale: 1.5,
    menuItemHeight: 36,
    menuWidth: 180
};

/**
 * Render AddNodeHelper per tutti gli handler SOURCE non connessi
 */
export function renderAddNodeHelpers(viewport) {
    const helpers = [];
    
    // Trova tutti gli handler SOURCE non connessi
    state.nodes.forEach(node => {
        node.handlers.forEach(handler => {
            if (handler.type === 'source') {
                // Verifica se è connesso - FIXED: controlla se esiste un link con questo handler come source
                const isConnected = state.links.some(link => String(link.source) === String(handler.id));
                
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
    
    // Render helpers
    let helperLayer = viewport.select("g.helper-layer");
    if (helperLayer.empty()) {
        helperLayer = viewport.append("g").attr("class", "helper-layer");
    }
    
    helperLayer.selectAll("g.add-node-helper")
        .data(helpers, d => d.handlerId) // Usa handlerId come key univoca
        .join(
            enter => {
                const group = enter.append("g")
                    .attr("class", "add-node-helper")
                    // È buona norma mettere l'ID nel DOM per debug
                    .attr("data-handler-id", d => d.handlerId) 
                    .attr("transform", d => `translate(${d.x}, ${d.y})`);
                
                // --- FIX QUI ---
                // Invece di renderHelper(group), usiamo .each()
                // Questo assicura che renderHelper venga chiamato per OGNI singolo nodo
                // con il contesto corretto (d3.select(this)).
                group.each(function() {
                    renderHelper(d3.select(this));
                });
                
                return group;
            },
            update => update.attr("transform", d => `translate(${d.x}, ${d.y})`),
            exit => exit.remove()
        );
}

function renderHelper(group) {
    const cfg = HELPER_CONFIG;
    const data = group.datum();
    
    group.append("line")
        .attr("class", "helper-link")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", cfg.linkLength)
        .attr("y2", 0);
    
    const buttonGroup = group.append("g")
        .attr("class", "helper-button")
        .attr("transform", `translate(${cfg.linkLength}, 0)`);
    
    buttonGroup.append("rect")
        .attr("class", "helper-box")
        .attr("x", -cfg.size / 2)
        .attr("y", -cfg.size / 2)
        .attr("width", cfg.size)
        .attr("height", cfg.size)
        .attr("rx", 4);
    
    const plusHalf = cfg.plusSize / 2;
    buttonGroup.append("path")
        .attr("class", "helper-plus")
        .attr("d", `
            M ${-plusHalf} 0 L ${plusHalf} 0
            M 0 ${-plusHalf} L 0 ${plusHalf}
        `)
        .attr("stroke-width", cfg.plusStrokeWidth);
    
    buttonGroup
        .on("mouseenter", function() {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("transform", `translate(${cfg.linkLength}, 0) scale(${cfg.hoverScale})`);
        })
        .on("mouseleave", function() {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("transform", `translate(${cfg.linkLength}, 0) scale(1)`);
        })
        .on("click", function(event) {
            event.stopPropagation();
            showNodeTypeMenu(event, data);
        });
}

function showNodeTypeMenu(event, helperData) {
    d3.selectAll(".node-type-menu").remove();
    
    const availableTypes = [];
    registry.getNodeTypes().forEach(type => {
        const def = registry.getNodeDefinition(type);
        const handlers = def.getHandlers();
        const hasTarget = handlers.some(h => h.type === 'target');
        
        if (hasTarget) {
            availableTypes.push({
                type: type,
                label: type.charAt(0).toUpperCase() + type.slice(1)
            });
        }
    });
    
    if (availableTypes.length === 0) return;
    
    const [mouseX, mouseY] = d3.pointer(event, d3.select("svg").node());
    
    const menu = d3.select("svg")
        .append("g")
        .attr("class", "node-type-menu")
        .attr("transform", `translate(${mouseX + 10}, ${mouseY})`);
    
    const menuHeight = availableTypes.length * HELPER_CONFIG.menuItemHeight;
    menu.append("rect")
        .attr("class", "menu-background")
        .attr("width", HELPER_CONFIG.menuWidth)
        .attr("height", menuHeight)
        .attr("rx", 6);
    
    availableTypes.forEach((nodeType, index) => {
        const itemGroup = menu.append("g")
            .attr("class", "menu-item")
            .attr("transform", `translate(0, ${index * HELPER_CONFIG.menuItemHeight})`)
            .style("cursor", "pointer")
            .on("mouseenter", function() {
                d3.select(this).select("rect").classed("menu-item-hover", true);
            })
            .on("mouseleave", function() {
                d3.select(this).select("rect").classed("menu-item-hover", false);
            })
            .on("click", function(e) {
                e.stopPropagation();
                createNodeFromHelper(helperData, nodeType.type);
                d3.selectAll(".node-type-menu").remove();
            });
        
        itemGroup.append("rect")
            .attr("class", "menu-item-bg")
            .attr("width", HELPER_CONFIG.menuWidth)
            .attr("height", HELPER_CONFIG.menuItemHeight);
        
        itemGroup.append("text")
            .attr("class", "menu-item-text")
            .attr("x", 16)
            .attr("y", HELPER_CONFIG.menuItemHeight / 2)
            .attr("dominant-baseline", "middle")
            .text(nodeType.label);
    });
    
    d3.select("svg").on("click.menu", function() {
        d3.selectAll(".node-type-menu").remove();
        d3.select(this).on("click.menu", null);
    });
}

function createNodeFromHelper(helperData, nodeType) {
    const sourceNode = state.nodes.find(n => n.id === helperData.nodeId);
    const sourceHandler = sourceNode.handlers.find(h => h.id === helperData.handlerId);
    
    if (!sourceNode || !sourceHandler) return;
    
    const newX = helperData.x + 150;
    const newY = helperData.y - 30;
    
    const newNode = createNode(nodeType, newX, newY);
    if (!newNode) return;
    
    state.nodes.push(newNode);
    
    const newNodeTargetHandler = newNode.handlers.find(h => h.type === 'target');
    
    if (newNodeTargetHandler) {
        state.links.push({
            id: `link_${Date.now()}`,
            source: sourceHandler.id,
            target: newNodeTargetHandler.id
        });
    }
    
    // FIXED: Force immediate re-render to update helpers
    render();
}

/**
 * Aggiorna posizioni helper - chiamato DOPO snap to grid
 */
export function updateAddNodeHelpers() {
    const viewport = d3.select("g.viewport");
    const helperLayer = viewport.select("g.helper-layer");
    
    if (helperLayer.empty()) return;
    
    helperLayer.selectAll("g.add-node-helper").each(function(d) {
        const node = state.nodes.find(n => n.id === d.nodeId);
        if (!node) return;
        
        const handler = node.handlers.find(h => h.id === d.handlerId);
        if (!handler) return;
        
        d.x = node.x + (handler.offset_x || 0);
        d.y = node.y + (handler.offset_y || 0);
        
        d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
    });
}