class BaseStrategy {
    constructor(store) { this.store = store; }
    
    // Helper to create input fields
    createInput(label, value, type = 'text', onChange) {
        const group = document.createElement('div');
        group.className = 'property-group';
        group.innerHTML = `<label>${label}</label>`;
        
        const input = document.createElement('input');
        input.type = type;
        input.className = 'prop-input';
        input.value = value || '';
        if (type === 'color' && !value) input.value = '#000000';
        
        // FIX: Use oninput for text/number to capture changes immediately
        // Use onchange for color inputs or others that might not fire oninput reliably across browsers
        const eventType = (type === 'text' || type === 'number') ? 'oninput' : 'onchange';

        input[eventType] = (e) => onChange(e.target.value);
        
        group.appendChild(input);
        return group;
    }

    createSeparator() {
        const div = document.createElement('div');
        div.className = 'panel-separator';
        div.style.margin = '15px 0';
        return div;
    }
}

export class NodePropertiesStrategy extends BaseStrategy {
    render(container, data) {
        // Standard Fields
        container.appendChild(this.createInput('Label', data.label, 'text', v => data.label = v));
        container.appendChild(this.createInput('Note', data.note, 'text', v => data.note = v));
        if (!data.style) data.style = { fontSize: 14 };
        
        container.appendChild(this.createInput(
            'Font Size (px)', 
            data.style.fontSize, 
            'number', 
            v => data.style.fontSize = parseInt(v)
        ));
        container.appendChild(this.createSeparator());

        // Key/Value Dictionary Editor (Requirement 4a)
        const kvTitle = document.createElement('label');
        kvTitle.innerText = "Custom Data";
        kvTitle.style.fontWeight = 'bold';
        container.appendChild(kvTitle);

        const kvContainer = document.createElement('div');
        container.appendChild(kvContainer);

        const renderKVRows = () => {
            kvContainer.innerHTML = '';
            if(!data.data) data.data = {};
            
            Object.entries(data.data).forEach(([key, val]) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.gap = '5px';
                row.style.marginBottom = '5px';

                const keyIn = document.createElement('input');
                keyIn.className = 'prop-input';
                keyIn.value = key;
                keyIn.placeholder = 'Key';
                keyIn.onchange = (e) => {
                    const newKey = e.target.value;
                    if(newKey && newKey !== key) {
                        data.data[newKey] = val;
                        delete data.data[key];
                        renderKVRows();
                    }
                };

                const valIn = document.createElement('input');
                valIn.className = 'prop-input';
                valIn.value = val;
                valIn.placeholder = 'Value';
                valIn.onchange = (e) => data.data[keyIn.value] = e.target.value;

                const delBtn = document.createElement('button');
                delBtn.className = 'icon-btn';
                delBtn.innerHTML = getIcon('delete', 16);
                delBtn.style.color = 'var(--danger)';
                delBtn.onclick = () => {
                    delete data.data[key];
                    renderKVRows();
                };

                row.append(keyIn, valIn, delBtn);
                kvContainer.appendChild(row);
            });
        };

        renderKVRows();

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-standard';
        addBtn.innerText = '+ Add Parameter';
        addBtn.style.width = 'auto';
        addBtn.style.fontSize = '12px';
        addBtn.onclick = () => {
            if(!data.data) data.data = {};
            data.data[`new_key_${Object.keys(data.data).length}`] = 'value';
            renderKVRows();
        };
        container.appendChild(addBtn);
    }

    save(id, data) {
        this.store.updateNode(id, { 
            label: data.label, 
            note: data.note,
            style: data.style, 
            data: data.data 
        });
    }
}

export class LinkPropertiesStrategy extends BaseStrategy {
    render(container, data) {
        // Init styles if missing
        if (!data.style) data.style = { stroke: '#606265', strokeWidth: 2 };
        if (!data.label) data.label = { text: '', color: '#606265', bgColor: '#f8fbff', fontSize: 12 };

        // Label Properties
        container.appendChild(this.createInput('Label Text', data.label.text, 'text', v => data.label.text = v));
        container.appendChild(this.createInput('Text Color', data.label.color, 'color', v => data.label.color = v));
        container.appendChild(this.createInput('Text Background', data.label.bgColor, 'color', v => data.label.bgColor = v));
        container.appendChild(this.createInput('Font Size (px)', data.label.fontSize, 'number', v => data.label.fontSize = parseInt(v)));

        container.appendChild(this.createSeparator());

        // Line Properties
        container.appendChild(this.createInput('Line Color', data.style.stroke, 'color', v => data.style.stroke = v));
        container.appendChild(this.createInput('Line Thickness', data.style.strokeWidth, 'number', v => data.style.strokeWidth = parseInt(v)));
    }

    save(id, data) {
        this.store.updateLink(id, { 
            label: data.label,
            style: data.style
        });
    }
}

export class NotePropertiesStrategy extends BaseStrategy {
    render(container, data) {
        if(!data.style) data.style = {};

        container.appendChild(this.createInput('Content', data.text, 'text', v => data.text = v));
        container.appendChild(this.createSeparator());
        
        container.appendChild(this.createInput('Background Color', data.style.backgroundColor, 'color', v => data.style.backgroundColor = v));
        container.appendChild(this.createInput('Text Color', data.style.color || '#000000', 'color', v => data.style.color = v));
        container.appendChild(this.createInput('Font Size', data.style.fontSize, 'text', v => data.style.fontSize = v));
    }

    save(id, data) {
        this.store.updateNote(id, {
            text: data.text,
            style: data.style
        });
    }
}