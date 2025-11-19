// ContextMenu.js - Context menu con icone Material per nodi
import { state } from './state.js';
import { removeNode } from './state.js';
import { render } from './render.js';

const MENU_CONFIG = {
    itemWidth: 180,
    itemHeight: 40,
    iconSize: 20,
    cornerRadius: 8
};

/**
 * Setup context menu per nodi
 */
export function setupNodeContextMenu(selection) {
    selection.on("contextmenu", function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        
        showContextMenu(event, d);
    });
}

/**
 * Mostra context menu
 */
function showContextMenu(event, nodeData) {
    // Rimuovi menu esistenti
    d3.selectAll(".context-menu").remove();
    
    // Menu items
    const menuItems = [
        {
            id: 'delete',
            label: 'Delete Node',
            icon: 'delete',
            action: () => deleteNode(nodeData.id)
        }
        // Aggiungi qui altri items futuri
    ];
    
    // Posizione menu
    const [mouseX, mouseY] = d3.pointer(event, d3.select("svg").node());
    
    // Crea menu
    const menu = d3.select("svg")
        .append("g")
        .attr("class", "context-menu")
        .attr("transform", `translate(${mouseX}, ${mouseY})`);
    
    const menuHeight = menuItems.length * MENU_CONFIG.itemHeight;
    
    // Shadow/background
    menu.append("rect")
        .attr("class", "context-menu-shadow")
        .attr("x", 2)
        .attr("y", 2)
        .attr("width", MENU_CONFIG.itemWidth)
        .attr("height", menuHeight)
        .attr("rx", MENU_CONFIG.cornerRadius)
        .attr("fill", "rgba(0,0,0,0.1)");
    
    menu.append("rect")
        .attr("class", "context-menu-bg")
        .attr("width", MENU_CONFIG.itemWidth)
        .attr("height", menuHeight)
        .attr("rx", MENU_CONFIG.cornerRadius);
    
    // Render items
    menuItems.forEach((item, index) => {
        const itemGroup = menu.append("g")
            .attr("class", "context-menu-item")
            .attr("transform", `translate(0, ${index * MENU_CONFIG.itemHeight})`)
            .style("cursor", "pointer")
            .on("mouseenter", function() {
                d3.select(this).select(".item-bg").classed("item-hover", true);
            })
            .on("mouseleave", function() {
                d3.select(this).select(".item-bg").classed("item-hover", false);
            })
            .on("click", function(e) {
                e.stopPropagation();
                item.action();
                d3.selectAll(".context-menu").remove();
            });
        
        // Item background
        itemGroup.append("rect")
            .attr("class", "item-bg")
            .attr("width", MENU_CONFIG.itemWidth)
            .attr("height", MENU_CONFIG.itemHeight);
        
        // Material Icon
        itemGroup.append("g")
            .attr("transform", `translate(12, ${MENU_CONFIG.itemHeight / 2})`)
            .html(getMaterialIcon(item.icon, MENU_CONFIG.iconSize));
        
        // Item text
        itemGroup.append("text")
            .attr("class", "context-menu-text")
            .attr("x", 12 + MENU_CONFIG.iconSize + 12)
            .attr("y", MENU_CONFIG.itemHeight / 2)
            .attr("dominant-baseline", "middle")
            .text(item.label);
    });
    
    // Chiudi menu cliccando fuori
    setTimeout(() => {
        d3.select("svg").on("click.contextmenu", function() {
            d3.selectAll(".context-menu").remove();
            d3.select(this).on("click.contextmenu", null);
        });
    }, 10);
}

/**
 * Material Icons SVG paths
 */
function getMaterialIcon(iconName, size) {
    const icons = {
        delete: `
            <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="material-icon">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
        `,
        // Aggiungi qui altre icone Material
    };
    
    return icons[iconName] || '';
}

/**
 * Azione: elimina nodo
 */
function deleteNode(nodeId) {
    removeNode(nodeId);
    render();
}

/**
 * Mostra context menu per link
 */
export function showLinkContextMenu(event, linkData) {
    d3.selectAll(".context-menu").remove();
    
    const menuItems = [
        {
            id: 'delete',
            label: 'Delete Link',
            icon: 'delete',
            action: () => deleteLink(linkData.id)
        }
    ];
    
    const [mouseX, mouseY] = d3.pointer(event, d3.select("svg").node());
    
    const menu = d3.select("svg")
        .append("g")
        .attr("class", "context-menu")
        .attr("transform", `translate(${mouseX}, ${mouseY})`);
    
    const menuHeight = menuItems.length * MENU_CONFIG.itemHeight;
    
    menu.append("rect")
        .attr("class", "context-menu-shadow")
        .attr("x", 2)
        .attr("y", 2)
        .attr("width", MENU_CONFIG.itemWidth)
        .attr("height", menuHeight)
        .attr("rx", MENU_CONFIG.cornerRadius)
        .attr("fill", "rgba(0,0,0,0.1)");
    
    menu.append("rect")
        .attr("class", "context-menu-bg")
        .attr("width", MENU_CONFIG.itemWidth)
        .attr("height", menuHeight)
        .attr("rx", MENU_CONFIG.cornerRadius);
    
    menuItems.forEach((item, index) => {
        const itemGroup = menu.append("g")
            .attr("class", "context-menu-item")
            .attr("transform", `translate(0, ${index * MENU_CONFIG.itemHeight})`)
            .style("cursor", "pointer")
            .on("mouseenter", function() {
                d3.select(this).select(".item-bg").classed("item-hover", true);
            })
            .on("mouseleave", function() {
                d3.select(this).select(".item-bg").classed("item-hover", false);
            })
            .on("click", function(e) {
                e.stopPropagation();
                item.action();
                d3.selectAll(".context-menu").remove();
            });
        
        itemGroup.append("rect")
            .attr("class", "item-bg")
            .attr("width", MENU_CONFIG.itemWidth)
            .attr("height", MENU_CONFIG.itemHeight);
        
        itemGroup.append("g")
            .attr("transform", `translate(12, ${MENU_CONFIG.itemHeight / 2})`)
            .html(getMaterialIcon(item.icon, MENU_CONFIG.iconSize));
        
        itemGroup.append("text")
            .attr("class", "context-menu-text")
            .attr("x", 12 + MENU_CONFIG.iconSize + 12)
            .attr("y", MENU_CONFIG.itemHeight / 2)
            .attr("dominant-baseline", "middle")
            .text(item.label);
    });
    
    setTimeout(() => {
        d3.select("svg").on("click.contextmenu", function() {
            d3.selectAll(".context-menu").remove();
            d3.select(this).on("click.contextmenu", null);
        });
    }, 10);
}

function deleteLink(linkId) {
    state.links = state.links.filter(l => l.id !== linkId);
    render();
}