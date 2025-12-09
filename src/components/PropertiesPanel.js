// src/components/PropertiesPanel.js
import { getIcon } from './Icons.js';

export class PropertiesPanel {
    constructor(container, eventBus, store) {
        this.container = container; // usually document.body
        this.eventBus = eventBus;
        this.store = store;
        this.element = null;
        this.currentStrategy = null;
        this.currentData = null; // Snapshot of data for "Cancel" behavior
        
        this.renderShell();
    }

    renderShell() {
        this.element = document.createElement('div');
        this.element.className = 'ui-panel properties-panel';
        this.element.style.display = 'none';
        
        // 1. Header (Title + Cancel Icon)
        const header = document.createElement('div');
        header.className = 'panel-header';
        
        this.titleEl = document.createElement('span');
        this.titleEl.className = 'panel-title';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'icon-btn';
        closeBtn.innerHTML = getIcon('close', 20);
        closeBtn.title = "Cancel";
        closeBtn.onclick = () => this.hide(); // Cancel operation

        header.append(this.titleEl, closeBtn);

        // 2. Content Body
        this.contentEl = document.createElement('div');
        this.contentEl.className = 'panel-content';

        // 3. Footer (Apply Button)
        const footer = document.createElement('div');
        footer.style.padding = "10px 15px";
        footer.style.borderTop = "1px solid #eee";

        const applyBtn = document.createElement('button');
        applyBtn.className = 'btn-standard';
        applyBtn.textContent = 'Apply';
        applyBtn.onclick = () => this.applyChanges();

        footer.appendChild(applyBtn);

        this.element.append(header, this.contentEl, footer);
        this.container.appendChild(this.element);
    }

    open(type, id) {
        // 1. Find Object
        const object = this.store.getObjectById(id);
        if (!object) return;

        // 2. Select Strategy
        import('./PropertiesStrategies.js').then(module => {
            let StrategyClass;
            const cleanType = type.toLowerCase();
            
            if (cleanType === 'link') StrategyClass = module.LinkPropertiesStrategy;
            else if (cleanType === 'note') StrategyClass = module.NotePropertiesStrategy;
            else StrategyClass = module.NodePropertiesStrategy; // Default for all node types

            if (StrategyClass) {
                this.currentStrategy = new StrategyClass(this.store);
                
                // Deep clone for local editing (simplified)
                this.currentData = JSON.parse(JSON.stringify(object)); 
                
                // Update Title
                // Capitalize first letter
                this.titleEl.textContent = object.type 
                    ? object.type.charAt(0).toUpperCase() + object.type.slice(1) 
                    : 'Properties';

                // Render Content
                this.contentEl.innerHTML = '';
                this.currentStrategy.render(this.contentEl, this.currentData);

                this.element.style.display = 'flex';
            }
        });
    }

    hide() {
        this.element.style.display = 'none';
        this.currentStrategy = null;
        this.currentData = null;
        this.store.deselect();
    }

    applyChanges() {
        if (this.currentStrategy && this.currentData) {
            this.currentStrategy.save(this.currentData.id, this.currentData);
            this.hide();
        }
    }
}