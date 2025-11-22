import { store } from './state.js';
import { eventBus } from './EventBus.js';
import { getStrokeIcon, getIcon } from './Icons.js';
import { registry } from './Registry.js';
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
        
        eventBus.on('SELECTION_CHANGED', (obj) => {
            if (obj) this.showPropertiesPanel(obj);
            else this.hidePropertiesPanel();
        });
    }
    
    createZoomPanel() {
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
                <button class="icon-btn" data-action="add-node" title="Add Node">${getStrokeIcon('addNode')}</button>
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
                case 'zoom-in': svg.transition().call(window.zoomBehavior.scaleBy, 1.3); break;
                case 'zoom-out': svg.transition().call(window.zoomBehavior.scaleBy, 0.7); break;
                case 'zoom-reset': svg.transition().call(window.zoomBehavior.transform, d3.zoomIdentity); break;
                case 'zoom-fit': this.fitToScreen(); break;
                case 'close-prop': store.deselect(); break;
                case 'save-file': 
                    console.log(JSON.stringify(store.serialize(), null, 2)); 
                    alert("Config dumped to console"); 
                    break;
                case 'open-file': this.openFile(); break;
                case 'add-node':
                    const rect = svg.node().getBoundingClientRect();
                    showNodeTypeMenu({x: rect.width/2, y: rect.height/2 - 100}, null, (type) => {
                        const t = d3.zoomTransform(svg.node());
                        const x = (rect.width/2 - t.x) / t.k;
                        const y = (rect.height/2 - t.y) / t.k;
                        store.addNode(type, x, y);
                    });
                    break;
            }
        });
    }

    fitToScreen() {
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
        svg.transition().duration(750).call(
            window.zoomBehavior.transform, 
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
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
            content.innerHTML = `<div class="property-group"><label>ID</label><input disabled value="${node.id}" class="prop-readonly"></div>`;
            
            const def = registry.getNodeDefinition(node.type);
            if (def) {
                const container = document.createElement('div');
                def.renderProperties(container, node, (key, val) => {
                    node[key] = val;
                    eventBus.emit('RENDER_REQUESTED');
                });
                content.appendChild(container);
            }
            const updBtn = document.createElement('button');
            updBtn.className = 'btn-standard'; updBtn.textContent = 'Update Node';
            updBtn.onclick = () => store.updateNode(node.id);
            content.appendChild(updBtn);
            const delBtn = document.createElement('button');
            delBtn.className = 'btn-danger'; delBtn.textContent = 'Delete Node';
            delBtn.onclick = () => store.removeNode(node.id);
            content.appendChild(delBtn);
            
        } else if (selected.type === 'link') {
            const link = selected.data;
            content.innerHTML = `
                <div class="property-group">
                    <label>Link ID</label>
                    <input disabled value="${link.id}" class="prop-readonly">
                </div>
            `;
            
            // Added: Label Text Input for Link
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
                     this.showPropertiesPanel(selected); // Refresh panel
                     eventBus.emit('RENDER_REQUESTED');
                 };
                 content.appendChild(addBtn);
            }

            const delBtn = document.createElement('button');
            delBtn.className = 'btn-danger'; delBtn.textContent = 'Delete Link';
            delBtn.onclick = () => store.removeLink(link.id);
            content.appendChild(delBtn);
        }
        
        panel.style.display = 'block';
    }
    
    hidePropertiesPanel() {
        if (this.panels.properties.element) 
            this.panels.properties.element.style.display = 'none';
    }
}

export const uiController = new UIController();