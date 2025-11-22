import { CONFIG } from './config.js';
import { store } from './state.js';
import { render, initRenderer } from './render.js';
import { Grid } from './Grid.js';
import { uiController } from './UIController.js';

document.addEventListener('DOMContentLoaded', () => {
    store.initializeWithDefaults();
    
    const svg = d3.select("#app-container").append("svg").attr("width", "100%").attr("height", "100%");
    svg.append("defs").html(`<linearGradient id="node-gradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#e8e8e8"/></linearGradient>`);
    
    const viewport = svg.append("g").attr("class", "viewport");
    viewport.append("g").attr("class", "grid-layer");
    viewport.append("g").attr("class", "helper-layer");
    viewport.append("g").attr("class", "link-layer");
    viewport.append("g").attr("class", "label-layer"); // ADDED: Label layer on top of links
    viewport.append("g").attr("class", "node-layer");
    
    Grid.render(viewport.select(".grid-layer"), CONFIG.canvas.width, CONFIG.canvas.height);
    
    const zoom = d3.zoom().scaleExtent([0.2, 4]).on("zoom", ({transform}) => {
        viewport.attr("transform", transform);
        store.transform = transform;
    });
    svg.call(zoom);
    window.zoomBehavior = zoom;
    
    uiController.initialize();
    initRenderer();
    
    svg.on("click", (e) => {
        if (e.target === svg.node()) store.deselect();
    });
    
    render();
});