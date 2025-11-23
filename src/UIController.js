// src/UIController.js
import { store } from './state.js';
import { eventBus } from './EventBus.js';
import { getStrokeIcon, getIcon } from './Icons.js';
import { showNodeTypeMenu } from './AddNodeHelper.js';

export class UIController {
    constructor() {
        this.panels = {
            zoom: { visible: true, element: null },
            properties: { visible: false, element: null }
        };
    }
    
    initialize() {
        this.createZoomPanel();
        this.createPropertiesPanel();
        this.attachEventListeners();
        
        // REQUESTED: Only open on specific EDIT event
        eventBus.on('EDIT_PROPERTIES', (obj) => {
            if(obj) this.showPropertiesPanel(obj);
        });
        
        // Hide panel if selection cleared
        eventBus.on('SELECTION_CHANGED', (obj) => {
            if (!obj) this.hidePropertiesPanel();
        });
    }
    
    // ... createZoomPanel / createPropertiesPanel (Standard) ...
    createZoomPanel() { /* ... same as previous ... */ 
        const p = document.createElement('div');
        p.className = 'ui-panel zoom-panel';
        p.innerHTML = `
            <div class="panel-group">
                <button class="icon-btn" data-action="zoom-in" title="Zoom In">${getStrokeIcon('zoomIn')}</button>
                <button class="icon-btn" data-action="zoom-out" title="Zoom Out">${getStrokeIcon('zoomOut')}</button>
                <button class="icon-btn" data-action="zoom-fit" title="Fit to Screen">${getStrokeIcon('zoomFitToScreen')}</button>
                <button class="icon-btn" data-action="zoom-reset" title="Reset View">${getStrokeIcon('zoomResetView')}</button>
            </div>
            <div class="panel-separator"></div>
            <div class="panel-group">
                <button class="icon-btn" id="btn-add-node" data-action="add-node" title="Add Node">${getStrokeIcon('addNode')}</button>
            </div>
            <div class="panel-separator"></div>
            <div class="panel-group">
                <button class="icon-btn" data-action="open-file" title="Open File">${getStrokeIcon('openFile')}</button>
                <button class="icon-btn" data-action="save-file" title="Save File">${getStrokeIcon('saveFile')}</button>
            </div>
        `;
        document.body.appendChild(p);
    }
    createPropertiesPanel() { /* ... same as previous ... */ 
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
                case 'zoom-in': svg.transition().call(window.zoomBehavior.scaleBy, 1.3); break;
                case 'zoom-out': svg.transition().call(window.zoomBehavior.scaleBy, 0.7); break;
                case 'zoom-reset': svg.transition().call(window.zoomBehavior.transform, d3.zoomIdentity); break;
                case 'zoom-fit': this.fitToScreen(); break;
                case 'close-prop': this.hidePropertiesPanel(); break;
                case 'save-file': console.log(JSON.stringify(store.serialize(), null, 2)); alert("Check Console"); break;
                case 'open-file': this.openFile(); break;
                case 'add-node':
                    // REQUESTED: Display close to button
                    const btnRect = btn.getBoundingClientRect();
                    // Position above the button (y - height) or to the side
                    showNodeTypeMenu({x: btnRect.left, y: btnRect.top - 150}, null, (type) => {
                        const rect = svg.node().getBoundingClientRect();
                        const t = d3.zoomTransform(svg.node());
                        // Center of screen logic for dropping the node itself
                        const x = (rect.width/2 - t.x) / t.k;
                        const y = (rect.height/2 - t.y) / t.k;
                        store.addNode(type, x, y);
                    });
                    break;
            }
        });
    }

    // ... fitToScreen, getGraphBounds, openFile ...
    fitToScreen() {
        // (Same as previous)
        const bounds = this.getGraphBounds();
        if (!bounds) return;
        const svg = d3.select('svg');
        const width = svg.node().clientWidth;
        const height = svg.node().clientHeight;
        const dx = bounds.maxX - bounds.minX;
        const dy = bounds.maxY - bounds.minY;
        const x = (bounds.minX + bounds.maxX) / 2;
        const y = (bounds.minY + bounds.maxY) / 2;
        const scale = Math.max(0.1, Math.min(4, 0.9 / Math.max(dx / width, dy / height)));
        const translate = [width / 2 - scale * x, height / 2 - scale * y];
        svg.transition().duration(750).call(window.zoomBehavior.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }
    getGraphBounds() {
         if (store.nodes.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        store.nodes.forEach(n => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + (n.width || 100));
            maxY = Math.max(maxY, n.y + (n.height || 50));
        });
        return { minX, minY, maxX, maxY };
    }
    openFile() {
         const input = document.createElement('input');
        input.type = 'file'; input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try { store.deserialize(JSON.parse(evt.target.result)); } 
                catch (err) { console.error(err); alert("Invalid JSON file"); }
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
            
            content.innerHTML = `
                <div class="property-group">
                    <label>Label</label>
                    <input type="text" id="node-label-input" value="${node.label || ''}" class="prop-input">
                </div>
                <div class="property-group">
                    <label>Sublabel</label>
                    <input type="text" id="node-sublabel-input" value="${node.sublabel || ''}" class="prop-input">
                </div>
                
                <div class="panel-separator" style="margin: 15px 0;"></div>
                <label style="font-weight:bold; color:#666; font-size:12px;">Custom Data</label>
                <div id="custom-props-container"></div>
                <button class="btn-standard" id="add-prop-btn" style="width:auto; font-size:12px; padding:4px 8px;">+ Add Data Key</button>
                
                <div id="def-props-container"></div>
            `;
            
            // Render definition specific properties (like Switch conditions)
            const def = import('./Registry.js').then(m => {
                 const definition = m.registry.getNodeDefinition(node.type);
                 if(definition) {
                     definition.renderProperties(content.querySelector('#def-props-container'), node, (k, v) => {
                         // Auto update for simple definition props if needed, 
                         // typically handled inside renderProperties
                     });
                 }
            });

            // Generic KV Logic
            const customContainer = content.querySelector('#custom-props-container');
            // Ensure node.data exists and ignore internal keys like 'conditions' if you want 
            // (or show them all, here we show all keys in data for generic editing)
            const customData = node.data || {}; 

            const renderCustomProp = (key, val) => {
                // Skip specific internal data keys if managed by Definition
                if (key === 'conditions' && node.type === 'switch') return; 
                
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

            content.querySelector('#add-prop-btn').onclick = () => renderCustomProp('', '');

            // Update Button
            const updBtn = document.createElement('button');
            updBtn.className = 'btn-standard';
            updBtn.textContent = 'Update Node';
            updBtn.onclick = () => {
                const newLabel = content.querySelector('#node-label-input').value;
                const newSublabel = content.querySelector('#node-sublabel-input').value;
                
                // Reconstruct Data Object
                const newData = {};
                // Preserve managed keys (like conditions)
                if (node.data && node.data.conditions) newData.conditions = node.data.conditions;

                customContainer.querySelectorAll('.property-group').forEach(row => {
                    const k = row.querySelector('.prop-key').value.trim();
                    const v = row.querySelector('.prop-val').value;
                    if(k) newData[k] = v;
                });

                store.updateNode(node.id, {
                    label: newLabel,
                    sublabel: newSublabel,
                    data: newData
                });
            };
            content.appendChild(updBtn);
        } else if (selected.type === 'link') {
             // (Link logic same as previous response)
              const link = selected.data;
            if (link.label) {
                const labelGroup = document.createElement('div');
                labelGroup.className = 'property-group';
                labelGroup.innerHTML = `
                    <label>Label Text</label>
                    <input type="text" value="${link.label.text}" class="prop-input">
                `;
                labelGroup.querySelector('input').onchange = (e) => {
                    link.label.text = e.target.value;
                    eventBus.emit('RENDER_REQUESTED');
                };
                content.appendChild(labelGroup);
            } else {
                 const addBtn = document.createElement('button');
                 addBtn.className = 'icon-btn'; 
                 addBtn.style.width = '100%';
                 addBtn.style.justifyContent = 'flex-start';
                 addBtn.innerHTML = `<span>+ Add Label</span>`;
                 addBtn.onclick = () => {
                     link.label = { text: 'Label', offset: 0.5, offsetX: 0, offsetY: 0 };
                     this.showPropertiesPanel(selected); 
                     eventBus.emit('RENDER_REQUESTED');
                 };
                 content.appendChild(addBtn);
            }
            const delBtn = document.createElement('button');
            delBtn.className = 'btn-danger'; delBtn.textContent = 'Delete Link';
            delBtn.onclick = () => { store.removeLink(link.id); this.hidePropertiesPanel(); };
            content.appendChild(delBtn);
        }
        
        panel.style.display = 'block';
        this.panels.properties.visible = true;
    }
    
    hidePropertiesPanel() {
        if (this.panels.properties.element) {
            this.panels.properties.element.style.display = 'none';
            this.panels.properties.visible = false;
        }
    }
}

export const uiController = new UIController();