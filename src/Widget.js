// DAGWidget.js - Widget API for embedding and external control
import { CONFIG } from './config.js';
import { initializeState, state, serializeState, deserializeState, addNode, removeNode } from './state.js';
import { render } from './render.js';
import { Grid } from './Grid.js';

/**
 * DAGWidget - Embeddable DAG Editor Widget
 * 
 * Usage:
 *   const widget = new DAGWidget('#container', {
 *     width: '100%',
 *     height: '600px',
 *     onNodeSelect: (node) => { ... },
 *     onNodeChange: (node, property, value) => { ... }
 *   });
 */
export class DAGWidget {
    constructor(containerSelector, options = {}) {
        this.container = typeof containerSelector === 'string' 
            ? document.querySelector(containerSelector)
            : containerSelector;
        
        if (!this.container) {
            throw new Error(`Container not found: ${containerSelector}`);
        }
        
        // Configuration
        this.options = {
            width: options.width || '100%',
            height: options.height || '600px',
            backgroundColor: options.backgroundColor || CONFIG.canvas.backgroundColor,
            showGrid: options.showGrid !== undefined ? options.showGrid : true,
            snapToGrid: options.snapToGrid !== undefined ? options.snapToGrid : true,
            enableZoom: options.enableZoom !== undefined ? options.enableZoom : true,
            minZoom: options.minZoom || CONFIG.zoom.min,
            maxZoom: options.maxZoom || CONFIG.zoom.max,
            initialData: options.initialData || null,
            ...options
        };
        
        // Callbacks
        this.callbacks = {
            onNodeSelect: options.onNodeSelect || null,
            onNodeDeselect: options.onNodeDeselect || null,
            onNodeChange: options.onNodeChange || null,
            onNodeCreate: options.onNodeCreate || null,
            onNodeDelete: options.onNodeDelete || null,
            onLinkCreate: options.onLinkCreate || null,
            onLinkDelete: options.onLinkDelete || null,
            onCanvasClick: options.onCanvasClick || null
        };
        
        // Internal state
        this.svg = null;
        this.viewport = null;
        this.zoomBehavior = null;
        this.isInitialized = false;
        
        // Initialize
        this.initialize();
    }
    
    /**
     * Initialize the widget
     */
    initialize() {
        console.log('[DAGWidget] Initializing...');
        
        // Set container styles
        this.container.style.position = 'relative';
        this.container.style.width = this.options.width;
        this.container.style.height = this.options.height;
        this.container.style.overflow = 'hidden';
        
        // Initialize state
        if (this.options.initialData) {
            deserializeState(this.options.initialData);
        } else {
            initializeState();
        }
        
        // Setup selection callback
        state.ui.onSelectionChange = (selectedObject) => {
            if (selectedObject && selectedObject.type === 'node') {
                if (this.callbacks.onNodeSelect) {
                    this.callbacks.onNodeSelect(selectedObject.data);
                }
            } else {
                if (this.callbacks.onNodeDeselect) {
                    this.callbacks.onNodeDeselect();
                }
            }
        };
        
        // Create SVG
        this.createSVG();
        
        // Setup zoom
        if (this.options.enableZoom) {
            this.setupZoom();
        }
        
        // Initial render
        render();
        
        this.isInitialized = true;
        console.log('[DAGWidget] ✓ Initialized');
        
        return this;
    }
    
    /**
     * Create SVG canvas
     */
    createSVG() {
        this.svg = d3.select(this.container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("background-color", this.options.backgroundColor);
        
        // Defs
        this.svg.append("defs").html(`
            <linearGradient id="node-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#e8e8e8" />
            </linearGradient>
        `);
        
        // Viewport with layers
        this.viewport = this.svg.append("g").attr("class", "viewport");
        
        // Grid layer
        if (this.options.showGrid) {
            const gridLayer = this.viewport.append("g").attr("class", "grid-layer");
            Grid.render(gridLayer, CONFIG.canvas.width, CONFIG.canvas.height);
        }
        
        // Link layer
        this.viewport.append("g").attr("class", "link-layer");
        
        // Node layer
        this.viewport.append("g").attr("class", "node-layer");
        
        // Canvas click handler
        this.svg.on("click", (event) => {
            if (event.target === this.svg.node()) {
                state.ui.selectedObject = null;
                render();
                
                if (this.callbacks.onCanvasClick) {
                    this.callbacks.onCanvasClick(event);
                }
            }
        });
    }
    
    /**
     * Setup zoom and pan
     */
    setupZoom() {
        const zoomed = ({ transform }) => {
            this.viewport.attr("transform", transform);
            state.transform = transform;
        };
        
        this.zoomBehavior = d3.zoom()
            .scaleExtent([this.options.minZoom, this.options.maxZoom])
            .on("zoom", zoomed);
        
        this.svg.call(this.zoomBehavior);
    }
    
    // ========== PUBLIC API ==========
    
    /**
     * Add a new node
     */
    addNode(type, x, y, additionalData = {}) {
        const node = addNode(type, x, y);
        if (node) {
            Object.assign(node, additionalData);
            render();
            
            if (this.callbacks.onNodeCreate) {
                this.callbacks.onNodeCreate(node);
            }
        }
        return node;
    }
    
    /**
     * Remove a node by ID
     */
    removeNode(nodeId) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
            removeNode(nodeId);
            render();
            
            if (this.callbacks.onNodeDelete) {
                this.callbacks.onNodeDelete(node);
            }
        }
    }
    
    /**
     * Update node properties
     */
    updateNode(nodeId, properties) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
            Object.assign(node, properties);
            render();
            
            if (this.callbacks.onNodeChange) {
                Object.keys(properties).forEach(key => {
                    this.callbacks.onNodeChange(node, key, properties[key]);
                });
            }
        }
        return node;
    }
    
    /**
     * Get node by ID
     */
    getNode(nodeId) {
        return state.nodes.find(n => n.id === nodeId);
    }
    
    /**
     * Get all nodes
     */
    getNodes() {
        return [...state.nodes];
    }
    
    /**
     * Get all links
     */
    getLinks() {
        return [...state.links];
    }
    
    /**
     * Select a node programmatically
     */
    selectNode(nodeId) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
            state.ui.selectedObject = { type: 'node', data: node };
            render();
            
            if (this.callbacks.onNodeSelect) {
                this.callbacks.onNodeSelect(node);
            }
        }
    }
    
    /**
     * Deselect current selection
     */
    deselectAll() {
        state.ui.selectedObject = null;
        render();
        
        if (this.callbacks.onNodeDeselect) {
            this.callbacks.onNodeDeselect();
        }
    }
    
    /**
     * Get current selection
     */
    getSelection() {
        return state.ui.selectedObject;
    }
    
    /**
     * Zoom controls
     */
    zoomIn() {
        if (this.zoomBehavior) {
            this.svg.transition().duration(300).call(
                this.zoomBehavior.scaleBy, 1.3
            );
        }
    }
    
    zoomOut() {
        if (this.zoomBehavior) {
            this.svg.transition().duration(300).call(
                this.zoomBehavior.scaleBy, 0.7
            );
        }
    }
    
    zoomReset() {
        if (this.zoomBehavior) {
            this.svg.transition().duration(300).call(
                this.zoomBehavior.transform,
                d3.zoomIdentity
            );
        }
    }
    
    zoomTo(scale, x = 0, y = 0) {
        if (this.zoomBehavior) {
            const transform = d3.zoomIdentity.translate(x, y).scale(scale);
            this.svg.transition().duration(300).call(
                this.zoomBehavior.transform,
                transform
            );
        }
    }
    
    /**
     * Pan to specific coordinates
     */
    panTo(x, y, duration = 300) {
        if (this.zoomBehavior) {
            const currentTransform = state.transform || d3.zoomIdentity;
            const newTransform = d3.zoomIdentity
                .translate(-x * currentTransform.k, -y * currentTransform.k)
                .scale(currentTransform.k);
            
            this.svg.transition().duration(duration).call(
                this.zoomBehavior.transform,
                newTransform
            );
        }
    }
    
    /**
     * Fit content to view
     */
    fitToView(padding = 50) {
        if (state.nodes.length === 0) return;
        
        // Calculate bounding box
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        state.nodes.forEach(node => {
            const w = node.width || CONFIG.node.width;
            const h = node.height || CONFIG.node.height;
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + w);
            maxY = Math.max(maxY, node.y + h);
        });
        
        const width = maxX - minX;
        const height = maxY - minY;
        const containerRect = this.container.getBoundingClientRect();
        
        const scale = Math.min(
            (containerRect.width - padding * 2) / width,
            (containerRect.height - padding * 2) / height,
            this.options.maxZoom
        );
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const x = containerRect.width / 2 - centerX * scale;
        const y = containerRect.height / 2 - centerY * scale;
        
        this.zoomTo(scale, x, y);
    }
    
    /**
     * Export graph as JSON
     */
    exportJSON() {
        return serializeState();
    }
    
    /**
     * Import graph from JSON
     */
    importJSON(data) {
        deserializeState(data);
        render();
    }
    
    /**
     * Clear all nodes and links
     */
    clear() {
        state.nodes = [];
        state.links = [];
        state.ui.selectedObject = null;
        render();
    }
    
    /**
     * Force re-render
     */
    refresh() {
        render();
    }
    
    /**
     * Destroy widget and cleanup
     */
    destroy() {
        if (this.svg) {
            this.svg.remove();
        }
        this.container.innerHTML = '';
        this.isInitialized = false;
        console.log('[DAGWidget] Destroyed');
    }
    
    /**
     * Resize widget
     */
    resize(width, height) {
        if (width) {
            this.container.style.width = width;
            this.options.width = width;
        }
        if (height) {
            this.container.style.height = height;
            this.options.height = height;
        }
    }
    
    /**
     * Register callback
     */
    on(event, callback) {
        const eventMap = {
            'nodeSelect': 'onNodeSelect',
            'nodeDeselect': 'onNodeDeselect',
            'nodeChange': 'onNodeChange',
            'nodeCreate': 'onNodeCreate',
            'nodeDelete': 'onNodeDelete',
            'linkCreate': 'onLinkCreate',
            'linkDelete': 'onLinkDelete',
            'canvasClick': 'onCanvasClick'
        };
        
        const callbackName = eventMap[event];
        if (callbackName) {
            this.callbacks[callbackName] = callback;
        }
        
        return this;
    }
}