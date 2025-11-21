// UIController.js - Centralized UI state and panel management
import { state } from './state.js';
import { render } from './render.js';
// 👇 QUESTA RIGA È FONDAMENTALE
import { getStrokeIcon, getIcon } from './Icons.js'; 

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
    
    initialize() {
        console.log('UIController: Initializing panels...');
        this.createZoomPanel();
        this.createPropertiesPanel();
        
        requestAnimationFrame(() => {
            this.attachEventListeners();
            console.log('UIController: Panels initialized successfully');
        });
    }
    
    createZoomPanel() {
        const panel = document.createElement('div');
        panel.id = 'zoom-panel';
        panel.className = 'ui-panel zoom-panel';
        panel.style.display = this.panels.zoom.visible ? 'flex' : 'none';
        
        // Ora getStrokeIcon è definito grazie all'import
        panel.innerHTML = `
            <div class="panel-group">
                <button class="icon-btn" data-action="zoom-in" title="Zoom In">
                    ${getStrokeIcon('zoomIn')}
                </button>
                <button class="icon-btn" data-action="zoom-out" title="Zoom Out">
                    ${getStrokeIcon('zoomOut')}
                </button>
                <button class="icon-btn" data-action="zoom-fit-to-screen" title="Fit to screen">
                    ${getStrokeIcon('zoomFitToScreen')}
                </button>
                <button class="icon-btn" data-action="zoom-reset-view" title="Reset view">
                    ${getStrokeIcon('zoomResetView')}
                </button>
            </div>
            <div class="panel-separator"></div> 
            <div class="panel-group">
                <button class="icon-btn" data-action="add-node" title="Add Node">
                    ${getStrokeIcon('addNode')}
                </button>
            </div>
            <div class="panel-separator"></div> 
            <div class="panel-group">
                <button class="icon-btn" data-action="open-file" title="Open file">
                    ${getStrokeIcon('openFile')}
                </button>
                <button class="icon-btn" data-action="save-file" title="Save file">
                    ${getStrokeIcon('saveFile')}
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panels.zoom.element = panel;
    }
    
    createPropertiesPanel() {
        const panel = document.createElement('div');
        panel.id = 'properties-panel';
        panel.className = 'ui-panel properties-panel';
        panel.style.display = 'none';
        
        panel.innerHTML = `
            <div class="panel-header">
                <h3 class="panel-title">Properties</h3>
                <button class="close-btn icon-btn" data-action="close-properties">
                    ${getIcon('close', 20)}
                </button>
            </div>
            <div class="panel-content" id="properties-content">
                <p class="empty-state">Select an object to view properties</p>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panels.properties.element = panel;
    }

    // ... (Il resto del file rimane invariato: attachEventListeners, handleAction, ecc.) ...
    
    attachEventListeners() {
        // Zoom controls
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Usa currentTarget per prendere il bottone anche se clicchi sull'SVG interno
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
    
    handleAction(action) {
        const svg = d3.select('svg');
        
        switch(action) {
            case 'zoom-in':
                svg.transition().call(window.zoomBehavior.scaleBy, 1.3);
                break;
            case 'zoom-out':
                svg.transition().call(window.zoomBehavior.scaleBy, 0.7);
                break;
            case 'fit-to-screen':
                //TODO
                break;
            case 'reset-view':
                svg.transition().call(window.zoomBehavior.transform, d3.zoomIdentity);
                break;
            case 'add-node':
                //TODO add new node to the canvas
                break;
            case 'open-file':
                //TODO
                break;
            case 'save-file':
                //TODO 
                break;
            case 'close-properties':
                this.hidePropertiesPanel();
                this.deselectAll();
                break;
        }
    }

    // ... copia qui il resto dei metodi (toggleZoomPanel, showPropertiesPanel, ecc.) ...
    // Assicurati di mantenere tutti i metodi della classe originale!
    
    toggleZoomPanel(visible) {
        this.panels.zoom.visible = visible;
        if (this.panels.zoom.element) {
            this.panels.zoom.element.style.display = visible ? 'flex' : 'none';
        }
    }
    
    showPropertiesPanel(selectedObject) {
        if (!selectedObject) return;
        
        const panel = this.panels.properties.element;
        const content = panel.querySelector('#properties-content');
        
        if (selectedObject.type === 'node') {
            content.innerHTML = this.generateNodeProperties(selectedObject.data);
        } else if (selectedObject.type === 'link') {
            content.innerHTML = this.generateLinkProperties(selectedObject.data);
        }
        
        panel.style.display = 'block';
        this.attachPropertyListeners(selectedObject);
    }
    
    hidePropertiesPanel() {
        if (this.panels.properties.element) {
            this.panels.properties.element.style.display = 'none';
        }
    }
    
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
                <input type="number" value="${Math.round(node.x)}" 
                       data-property="x" class="prop-editable">
            </div>
            <div class="property-group">
                <label>Position Y</label>
                <input type="number" value="${Math.round(node.y)}" 
                       data-property="y" class="prop-editable">
            </div>
            <div class="property-actions">
                <button class="btn-danger" data-action="delete-node">Delete Node</button>
            </div>
        `;
    }
    
    generateLinkProperties(link) {
        return `
            <div class="property-group">
                <label>ID</label>
                <input type="text" value="${link.id}" disabled class="prop-readonly">
            </div>
            <div class="property-group">
                <label>Source</label>
                <input type="text" value="${link.source}" disabled class="prop-readonly">
            </div>
            <div class="property-group">
                <label>Target</label>
                <input type="text" value="${link.target}" disabled class="prop-readonly">
            </div>
            <div class="property-actions">
                <button class="btn-danger" data-action="delete-link">Delete Link</button>
            </div>
        `;
    }
    
    attachPropertyListeners(selectedObject) {
        const content = document.querySelector('#properties-content');
        
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
    
    deleteNode(nodeId) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        const handlerIds = node.handlers.map(h => h.id);
        state.links = state.links.filter(l => 
            !handlerIds.includes(l.source) && !handlerIds.includes(l.target)
        );
        
        state.nodes = state.nodes.filter(n => n.id !== nodeId);
    }
    
    deleteLink(linkId) {
        state.links = state.links.filter(l => l.id !== linkId);
    }
    
    deselectAll() {
        state.ui.selectedObject = null;
        this.hidePropertiesPanel();
        render();
    }
    
    onSelectionChange(selectedObject) {
        if (selectedObject) {
            this.showPropertiesPanel(selectedObject);
        } else {
            this.hidePropertiesPanel();
        }
    }
    
    onPropertyChange(callback) {
        this.callbacks.onPropertyChange = callback;
    }
}

export const uiController = new UIController();