import { getStrokeIcon, getIcon } from './Icons.js';
import { showCustomMenu } from './ContextMenu.js';
import { PropertiesPanel } from './PropertiesPanel.js';

export class UIController {
    constructor(widget, store, eventBus, serializationService, registry) {
        this.widget = widget;
        this.store = store;
        this.eventBus = eventBus;
        this.serializationService = serializationService;
        this.registry = registry;
        this.panels = {
            zoom: { visible: true, element: null },
            properties: { visible: false, element: null },
            bufferedNode: null
        };
        this.propertiesPanel = null;
    }
    
    initialize() {
        this.createZoomPanel();
        this.propertiesPanel = new PropertiesPanel(document.body, this.eventBus, this.store);

        // 2. Listen for external requests (e.g., from Context Menu "Edit" button)
        this.eventBus.on('SHOW_PROPERTIES_PANEL', (payload) => {
            const { type, id } = payload;
            if (type && id) this.propertiesPanel.open({ type, id }); // Pass as object
        });

        // 3. Listen for "Edit" actions (Legacy support for context menu)
        this.eventBus.on('EDIT_PROPERTIES', (payload) => {
             if (payload.data && payload.data.id) {
                 this.propertiesPanel.open({ type: payload.type, id: payload.data.id });
             }
        });

        // 4. FIX: Handle Selection Changes (Do NOT open panel automatically)
        this.eventBus.on('SELECTION_CHANGED', (payload) => {
            if (!payload || !payload.id) {
                // Deselection: Always hide the panel
                this.propertiesPanel.hide(); 
            } 
            // Note: We removed the 'else { this.propertiesPanel.open(...) }' block 
            // so simple selection does not trigger the UI.
        });

        this.attachEventListeners();

        // Listen for history changes to update button states
        const updateHistoryButtons = (status) => {
            const undoBtn = document.querySelector('[data-action="undo"]');
            const redoBtn = document.querySelector('[data-action="redo"]');
            
            if (undoBtn) {
                undoBtn.style.opacity = status.canUndo ? '1' : '0.3';
                undoBtn.style.pointerEvents = status.canUndo ? 'auto' : 'none';
            }
            if (redoBtn) {
                redoBtn.style.opacity = status.canRedo ? '1' : '0.3';
                redoBtn.style.pointerEvents = status.canRedo ? 'auto' : 'none';
            }
        };
        this.eventBus.on('HISTORY_CHANGED', updateHistoryButtons);

        // Check initial history state
        if (this.store.history) {
            updateHistoryButtons({
                canUndo: this.store.history.canUndo(),
                canRedo: this.store.history.canRedo()
            });
        }
    }

    createZoomPanel() {
        const p = document.createElement('div');
        p.className = 'ui-panel zoom-panel';
        p.innerHTML = `
            <div class="panel-group">
                <button class="icon-btn" data-action="undo" title="Undo" style="opacity:0.3; pointer-events:none;">${getIcon('undo')}</button>
                <button class="icon-btn" data-action="redo" title="Redo" style="opacity:0.3; pointer-events:none;">${getIcon('redo')}</button>
            </div>
            <div class="panel-separator"></div>
            <div class="panel-group">
                <button class="icon-btn" data-action="zoom-in" title="Zoom In">${getStrokeIcon('zoomIn')}</button>
                <button class="icon-btn" data-action="zoom-out" title="Zoom Out">${getStrokeIcon('zoomOut')}</button>
                <button class="icon-btn" data-action="zoom-fit" title="Fit to Screen">${getStrokeIcon('zoomFitToScreen')}</button>
                <button class="icon-btn" data-action="zoom-reset" title="Reset View">${getStrokeIcon('zoomResetView')}</button>
            </div>
        
            <div class="panel-separator"></div>
            <div class="panel-group">
                <button class="icon-btn" id="btn-add-node" data-action="add-node" title="Add Node">${getStrokeIcon('addNode')}</button>
                <button class="icon-btn" id="btn-add-note" data-action="add-note" title="Add Note">${getStrokeIcon('addNote')}</button>
            </div>
            <div class="panel-separator"></div>
            <div class="panel-group">
                 <button class="icon-btn" data-action="open-file" title="Open File">${getStrokeIcon('openFile')}</button>
                  <button class="icon-btn" data-action="save-file" title="Save File">${getStrokeIcon('saveFile')}</button>
            </div>
        `;
        document.body.appendChild(p);
    }

    attachEventListeners() {
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const svg = d3.select('svg'); 
            
            switch(action) {
                case 'undo': this.store.history.undo(); break;
                case 'redo': this.store.history.redo(); break;
                case 'zoom-in': svg.transition().call(window.zoomBehavior.scaleBy, 1.3); break;
                case 'zoom-out': svg.transition().call(window.zoomBehavior.scaleBy, 0.7); break;
                case 'zoom-reset': svg.transition().call(window.zoomBehavior.transform, d3.zoomIdentity); break;
                case 'zoom-fit': this.widget.fitToScreen(); break;
                case 'close-prop': this.hidePropertiesPanel(); break;
                case 'save-file': 
                    const dataStr = JSON.stringify(this.serializationService.serialize(this.store.state), null, 2);
                    const blob = new Blob([dataStr], {type: "application/json"});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `graph_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    break;
                case 'open-file': this.openFile(); break;
                case 'add-node':
                    // 1. Get position of the clicked button
                    const btnRect = btn.getBoundingClientRect();
                    
                    // 2. Define the menu spawn point
                    // X: Aligned with the left of the button
                    // Y: Aligned with the top of the button (so menu grows upwards)
                    const menuX = btnRect.left;
                    const menuY = btnRect.top;

                    // 3. Show menu with 'top' alignment options
                    this.showNodeCreationMenu(menuX, menuY, null, { align: 'top' });
                    break;
                case 'add-note':
                    // Spawn in center of view
                    const center = this.widget.getWidgetCoordinates(
                        this.widget.container.clientWidth / 2, 
                        this.widget.container.clientHeight / 2
                    );
                    this.widget.dispatch('create_note', { x: center.x - 75, y: center.y - 50 });
                    break;
            }
        });
    }

    showNodeCreationMenu(clientX, clientY, sourceHandlerId = null, options = {}) {
        // Get registered node types
        const nodeTypes = this.registry.getNodeTypes().filter(t => t !== 'base');
        
        const menuItems = nodeTypes.map(type => {
            const def = this.registry.getNodeDefinition(type);
            return {
                label: type.charAt(0).toUpperCase() + type.slice(1),
                icon: getStrokeIcon('addNode', 16), // Or specific icons if available
                callback: () => {
                    // Convert Screen Coords -> Graph Coords
                    const transform = this.store.transform;
                    const graphX = (clientX - transform.x) / transform.k;
                    const graphY = (clientY - transform.y) / transform.k;

                    if (options.align === 'top' && !sourceHandlerId) {
                        // Spawn in center of Viewport
                        const svgRect = d3.select('svg').node().getBoundingClientRect();
                        const centerX = (svgRect.width/2 - transform.x) / transform.k;
                        const centerY = (svgRect.height/2 - transform.y) / transform.k;
                        this.store.addNode(type, centerX, centerY);
                    } else {
                        if (sourceHandlerId) {
                            // Offset the new node slightly to the right of the click
                            this.store.eventBus.emit('CMD_REQUESTED', {
                                command: 'spawn_node_connected',
                                payload: { type, x: graphX + 50, y: graphY - 20, sourceHandlerId }
                            });
                        } else {
                            this.store.addNode(type, graphX, graphY);
                        }
                    }
                }
            };
        });

        showCustomMenu(clientX, clientY, menuItems, options);
    }

    openFile() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try { 
                    const data = JSON.parse(evt.target.result);
                    const { nodes, links, viewport } = this.serializationService.deserialize(data);
                    this.store.loadState({ nodes, links, viewport });
                } 
                catch (err) { 
                    console.error(err);
                    alert("Invalid JSON file"); 
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }


}