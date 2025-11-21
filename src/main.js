// main.js - Final version with proper initialization
import { CONFIG } from './config.js';
import { initializeState, state, serializeState, deserializeState } from './state.js';
import { render } from './render.js';
import { Grid } from './Grid.js';
import { uiController } from './UIController.js';

console.log('[Main] Starting DAG Editor initialization...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Main] DOM Content Loaded');
    
    // Initialize state
    initializeState();
    console.log('[Main] ✓ State initialized');
    
    // Create SVG canvas
    const appContainer = d3.select("#app-container");
    const svg = appContainer.append("svg")
        .attr("width", "100%")
        .attr("height", "100%");
    
    console.log('[Main] ✓ SVG canvas created');
    
    // Add defs for gradients
    svg.append("defs").html(`
        <linearGradient id="node-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#e8e8e8" />
        </linearGradient>
    `);
    
    // Create viewport with layers
    const viewport = svg.append("g").attr("class", "viewport");
    
    const gridLayer = viewport.append("g").attr("class", "grid-layer");
    Grid.render(gridLayer, CONFIG.canvas.width, CONFIG.canvas.height);
    viewport.append("g").attr("class", "helper-layer");
    viewport.append("g").attr("class", "link-layer");
    viewport.append("g").attr("class", "node-layer");

    // Setup zoom and pan
    function zoomed({ transform }) {
        viewport.attr("transform", transform);
        state.transform = transform;
    }
    
    const zoomBehavior = d3.zoom()
        .scaleExtent([CONFIG.zoom.min, CONFIG.zoom.max])
        .on("zoom", zoomed);
    
    svg.call(zoomBehavior);
    window.zoomBehavior = zoomBehavior; // Make available globally
    
    // Initialize UI Controller
    uiController.initialize();
    
    // Connect selection callback
    state.ui.onSelectionChange = (selectedObject) => {
        uiController.onSelectionChange(selectedObject);
    };
    
    // Register property change callback
    uiController.onPropertyChange((selectedObject, property, value) => {
        console.log(`[Main] Property "${property}" changed to:`, value);
    });
    
    // Deselect on canvas click
    svg.on("click", function(event) {
        if (event.target === this) {
            state.ui.selectedObject = null;
            uiController.hidePropertiesPanel();
            render();
        }
    });
    
    // Initial render
    render();
    
    // Update debug info
    setTimeout(() => {
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo) {
            debugInfo.innerHTML = `
                ✓ DAG Editor Ready<br>
                ✓ Nodes: ${state.nodes.length}<br>
                ✓ Links: ${state.links.length}<br>
                ✓ Zoom: ${document.getElementById('zoom-panel') ? '✓' : '✗'}<br>
                ✓ Props: ${document.getElementById('properties-panel') ? '✓' : '✗'}
            `;
        }
    }, 500);
    
    // Expose API for testing
    window.DAG = {
        getState: () => state,
        serialize: serializeState,
        deserialize: deserializeState,
        render: render,
        config: CONFIG,
        ui: uiController,
        // Debugging helpers
        debug: {
            showZoom: () => uiController.toggleZoomPanel(true),
            hideZoom: () => uiController.toggleZoomPanel(false),
            logState: () => console.log('Current State:', state),
            testSelect: () => {
                if (state.nodes.length > 0) {
                    state.ui.selectedObject = { type: 'node', data: state.nodes[0] };
                    uiController.onSelectionChange(state.ui.selectedObject);
                    render();
                }
            }
        }
    };
    
});