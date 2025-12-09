import { getStrokeIcon, getIcon } from './Icons.js';
import { showCustomMenu } from './ContextMenu.js'; 

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
    }
    
    initialize() {
        this.createZoomPanel();
        this.createPropertiesPanel();
        this.attachEventListeners();
        this.eventBus.on('EDIT_PROPERTIES', (payload) => {
            const { type, data } = payload; 
            if(data) {
                this.showPropertiesPanel({ type, data });
            }
        });
        this.eventBus.on('SELECTION_CHANGED', (payload) => {
            if (!payload || !payload.id) {
                this.hidePropertiesPanel();
            } else {
                if (this.panels.properties.visible) {
                     const data = payload.type === 'node' ? this.store.getNode(payload.id) : this.store.getLink(payload.id);
                      if(data) this.showPropertiesPanel({ type: payload.type, data });
                }
            }
        });
        // Listen for history changes to update button states (opacity/disabled)
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

        // 3. FIX: Immediate State Check (Force sync on init)
        // Check if store has history capability and update immediately
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

    createPropertiesPanel() {
        const p = document.createElement('div');
        p.className = 'ui-panel properties-panel';
        p.style.display = 'none';
        p.innerHTML = `
            <div class="panel-header">
                <h3 class="panel-title">Properties</h3>
                <button class="icon-btn" data-action="close-prop">${getIcon('close', 20)}</button>
            </div>
            <div class="panel-content" id="prop-content"></div>
        `;
        document.body.appendChild(p);
        this.panels.properties.element = p;
    }

    attachEventListeners() {
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const svg = d3.select('svg'); 
            
            switch(action) {
                case 'undo': this.store.undo(); break;
                case 'redo': this.store.redo(); break;
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

    showPropertiesPanel(selected) {
        const panel = this.panels.properties.element; 
        const content = panel.querySelector('#prop-content'); 
        content.innerHTML = '';
        
        if (selected.type === 'node') {
            const node = selected.data;
            // Store the original node data for "cancel"
            this.panels.properties.bufferedNode = node; 

            // --- REFACTORED: Add Title and Subtitle ---
            content.innerHTML = `
                <div class="property-group">
                    <label>Type</label>
                    <input type="text" value="${node.type}" class="prop-input prop-readonly" readonly>
                </div>
                <div class="property-group">
                    <label>ID</label>
                    <input type="text" value="${node.id}" class="prop-input prop-readonly" readonly>
                </div>
                <div class="panel-separator" style="margin: 15px 0;"></div>
                
                <div class="property-group">
                    <label>Label</label>
                    <input type="text" id="node-label-input" value="${node.label || ''}" class="prop-input">
                </div>
                <div class="property-group">
                    <label>Note</label>
                    <input type="text" id="node-note-input" value="${node.note || ''}" class="prop-input">
                </div>
                
                <div class="panel-separator" style="margin: 15px 0;"></div>
                
                <label style="font-weight:bold; color:#666; font-size:12px;">Node Data (key/value)</label>
                <div id="custom-params-container"></div>
                <button class="btn-standard" id="add-param-btn" style="width:auto; font-size:12px; padding:4px 8px;">+ Add Param</button>
                
                <div id="def-props-container"></div>
            `;
            
            // --- REFACTORED: Use node.data ---
            const customContainer = content.querySelector('#custom-params-container');
            const customData = node.data || {};  
            
            const renderCustomProp = (key, val) => {
                const row = document.createElement('div'); 
                row.className = 'property-group'; 
                row.style.display = 'flex';
                row.style.gap = '5px';
                row.innerHTML = `
                    <input type="text" placeholder="Key" class="prop-input prop-key" value="${key}">
                    <input type="text" placeholder="Value" class="prop-input prop-val" value="${val}">
                    <button class="icon-btn prop-del" style="width:24px; height:24px;">${getIcon('close', 16)}</button>
                `; 
                row.querySelector('.prop-del').onclick = () => row.remove(); 
                customContainer.appendChild(row);
            };

            Object.entries(customData).forEach(([k, v]) => renderCustomProp(k, v));
            content.querySelector('#add-param-btn').onclick = () => renderCustomProp('', '');

            // --- Render definition-specific properties (Unchanged) ---
            /*import('./Registry.js').then(m => { 
                 const definition = m.registry.getNodeDefinition(node.type);
                 if(definition) {
                     definition.renderProperties(content.querySelector('#def-props-container'), node, (k, v) => {
                     }); 
                 }
             });*/

            const definition = this.registry.getNodeDefinition(node.type);
            if(definition) {
                definition.renderProperties(content.querySelector('#def-props-container'), node, (k, v) => {}); 
            }
            

            // --- REFACTORED: Button Group ---
            const buttonGroup = document.createElement('div');
            buttonGroup.style.display = 'flex';
            buttonGroup.style.gap = '10px';
            buttonGroup.style.marginTop = '20px';

            // --- "Apply" Button (Replaces "Update Node") ---
            const applyBtn = document.createElement('button');
            applyBtn.className = 'btn-standard';
            applyBtn.textContent = 'Apply'; // <-- RENAMED 
            applyBtn.style.flex = '1';
            applyBtn.onclick = () => {
                const newLabel = content.querySelector('#node-label-input').value; 
                const newNote = content.querySelector('#node-note-input').value; 
                
                const newParams = {};
                customContainer.querySelectorAll('.property-group').forEach(row => { 
                    const k = row.querySelector('.prop-key').value.trim();
                    const v = row.querySelector('.prop-val').value;
                    if(k) newParams[k] = v;
                });
                
                this.store.updateNode(node.id, {
                    label: newLabel,
                    note: newNote,
                    data: newParams 
                });
                
                this.hidePropertiesPanel(); // <-- Close panel
            };
            buttonGroup.appendChild(applyBtn);

            // --- "Cancel" Button (NEW) ---
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-standard'; 
            cancelBtn.style.background = 'var(--pale-slate)';
            cancelBtn.style.color = 'var(--dim-gray)';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.flex = '1';
            cancelBtn.onclick = () => { 
                this.hidePropertiesPanel(); // Just close, no action
            };
            buttonGroup.appendChild(cancelBtn);

            // --- "Delete" Button (Replaces "Delete Node") ---
            const delBtn = document.createElement('button');
            delBtn.className = 'btn-danger'; 
            delBtn.textContent = 'Delete'; 
            delBtn.style.flex = '1';
            delBtn.onclick = () => { 
                this.store.removeNode(node.id); 
                this.hidePropertiesPanel(); 
            };
            buttonGroup.appendChild(delBtn);
            
            content.appendChild(buttonGroup);

        } else if (selected.type === 'link') {
            // --- This section is UNCHANGED ---
            const link = selected.data; 
            if (link.label) { 
                const labelGroup = document.createElement('div'); 
                labelGroup.className = 'property-group'; 
                labelGroup.innerHTML = `
                    <label>Label Text</label>
                    <input type="text" value="${link.label.text}" class="prop-input">
                `; 
                labelGroup.querySelector('input').onchange = (e) => { 
                    this.store.updateLink(link.id, { label: { ...link.label, text: e.target.value } });
                };
                content.appendChild(labelGroup); 
            } else {
                 const addBtn = document.createElement('button'); 
                 addBtn.className = 'icon-btn'; 
                 addBtn.style.width = '100%';
                 addBtn.style.justifyContent = 'flex-start';
                 addBtn.innerHTML = `<span>+ Add Label</span>`; 
                 addBtn.onclick = () => {
                    this.store.updateLink(link.id, { label: { text: 'Label', offset: 0.5, offsetX: 0, offsetY: 0 } }); 
                    this.showPropertiesPanel(selected); 
                 };
                 content.appendChild(addBtn);
            }
            const delBtn = document.createElement('button'); 
            delBtn.className = 'btn-danger'; delBtn.textContent = 'Delete Link'; 
            delBtn.onclick = () => { this.store.removeLink(link.id); this.hidePropertiesPanel(); };
            content.appendChild(delBtn); 
        }
        
        panel.style.display = 'block'; 
        this.panels.properties.visible = true; 
    }
    
    hidePropertiesPanel() {
        if (this.panels.properties.element) {
            this.panels.properties.element.style.display = 'none'; 
            this.panels.properties.visible = false; 
            this.panels.properties.bufferedNode = null; 
        }
    }
}