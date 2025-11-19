// UIController.js - Centralized UI state and panel management
import { state } from './state.js';
import { render } from './render.js';

export class UIController {
    constructor() {
        this.panels = {
            zoom: { visible: true, element: null },
            properties: { visible: false, element: null }
        };
        
        this.callbacks = {
            onPropertyChange: null
        };
    }
    
    /**
     * Initialize all UI panels
     */
    initialize() {
        console.log('UIController: Initializing panels...');
        this.createZoomPanel();
        this.createPropertiesPanel();
        
        // Wait for next frame to ensure DOM is ready
        requestAnimationFrame(() => {
            this.attachEventListeners();
            console.log('UIController: Panels initialized successfully');
        });
    }
    
    /**
     * Create zoom control panel
     */
    createZoomPanel() {
        const panel = document.createElement('div');
        panel.id = 'zoom-panel';
        panel.className = 'ui-panel zoom-panel';
        panel.style.display = this.panels.zoom.visible ? 'flex' : 'none';
        
        panel.innerHTML = `
            <button class="zoom-btn" data-action="zoom-in" title="Zoom In">
                <svg width="24" height="24" viewBox="0 0 20 20">
                    <path d="M10 5 L10 15 M5 10 L15 10" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
            <button class="zoom-btn" data-action="zoom-reset" title="Reset Zoom">
                <svg width="24" height="24" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
            <button class="zoom-btn" data-action="zoom-out" title="Zoom Out">
                <svg width="24" height="24" viewBox="0 0 20 20">
                    <path d="M5 10 L15 10" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
        `;
        
        document.body.appendChild(panel);
        this.panels.zoom.element = panel;
    }
    
    /**
     * Create properties panel
     */
    createPropertiesPanel() {
        const panel = document.createElement('div');
        panel.id = 'properties-panel';
        panel.className = 'ui-panel properties-panel';
        panel.style.display = 'none';
        
        panel.innerHTML = `
            <div class="panel-header">
                <h3 class="panel-title">Properties</h3>
                <button class="close-btn" data-action="close-properties">&times;</button>
            </div>
            <div class="panel-content" id="properties-content">
                <p class="empty-state">Select an object to view properties</p>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panels.properties.element = panel;
    }
    
    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // Zoom controls
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAction(action);
            });
        });
        
        // Deselect on canvas click
        const svg = document.querySelector('svg');
        if (svg) {
            svg.addEventListener('click', (e) => {
                if (e.target === svg || e.target.closest('g.viewport')) {
                    this.deselectAll();
                }
            });
        }
    }
    
    /**
     * Handle UI actions
     */
    handleAction(action) {
        const svg = d3.select('svg');
        const viewport = d3.select('g.viewport');
        
        switch(action) {
            case 'zoom-in':
                svg.transition().call(
                    window.zoomBehavior.scaleBy, 1.3
                );
                break;
                
            case 'zoom-out':
                svg.transition().call(
                    window.zoomBehavior.scaleBy, 0.7
                );
                break;
                
            case 'zoom-reset':
                svg.transition().call(
                    window.zoomBehavior.transform, 
                    d3.zoomIdentity
                );
                break;
                
            case 'close-properties':
                this.hidePropertiesPanel();
                this.deselectAll();
                break;
        }
    }
    
    /**
     * Show/hide zoom panel
     */
    toggleZoomPanel(visible) {
        this.panels.zoom.visible = visible;
        if (this.panels.zoom.element) {
            this.panels.zoom.element.style.display = visible ? 'flex' : 'none';
        }
    }
    
    /**
     * Show properties panel with object data
     */
    showPropertiesPanel(selectedObject) {
        if (!selectedObject) return;
        
        const panel = this.panels.properties.element;
        const content = panel.querySelector('#properties-content');
        
        // Generate properties based on object type
        if (selectedObject.type === 'node') {
            content.innerHTML = this.generateNodeProperties(selectedObject.data);
        } else if (selectedObject.type === 'link') {
            content.innerHTML = this.generateLinkProperties(selectedObject.data);
        }
        
        panel.style.display = 'block';
        this.attachPropertyListeners(selectedObject);
    }
    
    /**
     * Hide properties panel
     */
    hidePropertiesPanel() {
        if (this.panels.properties.element) {
            this.panels.properties.element.style.display = 'none';
        }
    }
    
    /**
     * Generate node property editor HTML
     */
    generateNodeProperties(node) {
        return `
            <div class="property-group">
                <label>Type</label>
                <input type="text" value="${node.type}" disabled class="prop-readonly">
            </div>
            <div class="property-group">
                <label>ID</label>
                <input type="text" value="${node.id}" disabled class="prop-readonly">
            </div>
            <div class="property-group">
                <label>Label</label>
                <input type="text" value="${node.label || ''}" 
                       data-property="label" class="prop-editable">
            </div>
            ${node.sublabel !== undefined ? `
            <div class="property-group">
                <label>Sublabel</label>
                <input type="text" value="${node.sublabel || ''}" 
                       data-property="sublabel" class="prop-editable">
            </div>
            ` : ''}
            <div class="property-group">
                <label>Position X</label>
                <input type="number" value="${node.x}" 
                       data-property="x" class="prop-editable">
            </div>
            <div class="property-group">
                <label>Position Y</label>
                <input type="number" value="${node.y}" 
                       data-property="y" class="prop-editable">
            </div>
            <div class="property-actions">
                <button class="btn-danger" data-action="delete-node">Delete Node</button>
            </div>
        `;
    }
    
    /**
     * Generate link property editor HTML
     */
    generateLinkProperties(link) {
        return `
            <div class="property-group">
                <label>ID</label>
                <input type="text" value="${link.id}" disabled class="prop-readonly">
            </div>
            <div class="property-group">
                <label>Source Handler</label>
                <input type="text" value="${link.source}" disabled class="prop-readonly">
            </div>
            <div class="property-group">
                <label>Target Handler</label>
                <input type="text" value="${link.target}" disabled class="prop-readonly">
            </div>
            <div class="property-actions">
                <button class="btn-danger" data-action="delete-link">Delete Link</button>
            </div>
        `;
    }
    
    /**
     * Attach listeners to property inputs
     */
    attachPropertyListeners(selectedObject) {
        const content = document.querySelector('#properties-content');
        
        // Edit properties
        content.querySelectorAll('.prop-editable').forEach(input => {
            input.addEventListener('change', (e) => {
                const property = e.target.dataset.property;
                const value = e.target.type === 'number' 
                    ? parseFloat(e.target.value) 
                    : e.target.value;
                
                selectedObject.data[property] = value;
                
                if (this.callbacks.onPropertyChange) {
                    this.callbacks.onPropertyChange(selectedObject, property, value);
                }
                
                render();
            });
        });
        
        // Delete actions
        content.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                
                if (action === 'delete-node') {
                    this.deleteNode(selectedObject.data.id);
                } else if (action === 'delete-link') {
                    this.deleteLink(selectedObject.data.id);
                }
                
                this.hidePropertiesPanel();
                this.deselectAll();
                render();
            });
        });
    }
    
    /**
     * Delete a node
     */
    deleteNode(nodeId) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        // Remove connected links
        const handlerIds = node.handlers.map(h => h.id);
        state.links = state.links.filter(l => 
            !handlerIds.includes(l.source) && !handlerIds.includes(l.target)
        );
        
        // Remove node
        state.nodes = state.nodes.filter(n => n.id !== nodeId);
    }
    
    /**
     * Delete a link
     */
    deleteLink(linkId) {
        state.links = state.links.filter(l => l.id !== linkId);
    }
    
    /**
     * Deselect all objects
     */
    deselectAll() {
        state.ui.selectedObject = null;
        this.hidePropertiesPanel();
        render();
    }
    
    /**
     * Handle object selection
     */
    onSelectionChange(selectedObject) {
        if (selectedObject) {
            this.showPropertiesPanel(selectedObject);
        } else {
            this.hidePropertiesPanel();
        }
    }
    
    /**
     * Register callback for property changes
     */
    onPropertyChange(callback) {
        this.callbacks.onPropertyChange = callback;
    }
}

// Export singleton instance
export const uiController = new UIController();