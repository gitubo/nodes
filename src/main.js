// main.js
import { CONFIG } from './config.js';
import { initializeState, state, serializeState, deserializeState } from './state.js';
import { render } from './render.js';
import { Grid } from './Grid.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeState();
    
    const appContainer = d3.select("#app-container");
    const svg = appContainer.append("svg")
        .attr("width", "100%")
        .attr("height", "100%");
    
    // Defs for gradients and filters
    svg.append("defs").html(`
        <linearGradient id="node-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#e8e8e8" />
        </linearGradient>
    `);
    
    // Viewport with layers
    const viewport = svg.append("g").attr("class", "viewport");
    
    // Layer 1: Grid
    const gridLayer = viewport.append("g").attr("class", "grid-layer");
    Grid.render(gridLayer, CONFIG.canvas.width, CONFIG.canvas.height);
    
    // Layer 2: Links
    viewport.append("g").attr("class", "link-layer");
    
    // Layer 3: Nodes
    viewport.append("g").attr("class", "node-layer");
    
    // Zoom and pan behavior
    function zoomed({ transform }) {
        viewport.attr("transform", transform);
        state.transform = transform;
    }
    
    const zoomBehavior = d3.zoom()
        .scaleExtent([CONFIG.zoom.min, CONFIG.zoom.max])
        .on("zoom", zoomed);
    
    svg.call(zoomBehavior);
    
    // Initial render
    render();
    
    // Expose API for testing
    window.DAG = {
        getState: () => state,
        serialize: serializeState,
        deserialize: deserializeState,
        render: render,
        config: CONFIG
    };
});