export class Note {
    constructor(id, data, widget) {
        this.id = id;
        this.widget = widget;
        this.data = data; // Reference to Store object
        
        // Wrapper for SVG compatibility
        this.foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        this.el = document.createElement('div'); // The actual visual note
        
        this.render();
    }

    render() {
        // 1. Setup Foreign Object (Positioning Wrapper)
        this.foreignObject.setAttribute('x', this.data.x);
        this.foreignObject.setAttribute('y', this.data.y);
        this.foreignObject.setAttribute('width', this.data.width);
        this.foreignObject.setAttribute('height', this.data.height);
        this.foreignObject.style.overflow = 'visible'; // Allow handles to protrude

        // 2. Setup Inner HTML (Visuals)
        this.el.className = 'note';
        this.el.id = this.id;
        this.el.style.width = '100%';
        this.el.style.height = '100%';
        this.el.style.boxSizing = 'border-box'; // Critical for borders
        
        // Content
        this.labelEl = document.createElement('div');
        this.labelEl.className = 'note-label';
        this.el.appendChild(this.labelEl);

        // Resize Handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'note-resize-handle';
        this.el.appendChild(resizeHandle);
        
        this.foreignObject.appendChild(this.el);
        
        // 3. Append to SVG Layer
        if (this.widget.layers && this.widget.layers.notes) {
            this.widget.layers.notes.appendChild(this.foreignObject);
        } else {
            console.error("Note Layer not found!");
        }

        this.updateView();
        this._attachEvents(resizeHandle);
    }

    updateView() {
        // Update SVG Wrapper Dimensions
        this.foreignObject.setAttribute('x', this.data.x);
        this.foreignObject.setAttribute('y', this.data.y);
        this.foreignObject.setAttribute('width', this.data.width);
        this.foreignObject.setAttribute('height', this.data.height);

        // Update Styles
        this.el.style.backgroundColor = this.data.style.backgroundColor;
        this.labelEl.innerText = this.data.text;
        this.labelEl.style.color = this.data.style.color;
        this.labelEl.style.fontSize = this.data.style.fontSize;
    }

    _attachEvents(resizeHandle) {
        // Dragging Logic
        this.el.addEventListener('mousedown', (e) => {
            if(e.target === resizeHandle || e.button !== 0) return;
            e.stopPropagation(); // Stop D3 Zoom panning
            
            const startX = e.clientX;
            const startY = e.clientY;
            // Get current scale to adjust drag speed
            const k = this.widget.store.transform.k; 
            const initialX = this.data.x;
            const initialY = this.data.y;

            const onMove = (me) => {
                const dx = (me.clientX - startX) / k; // Adjust for zoom
                const dy = (me.clientY - startY) / k;
                
                this.data.x = initialX + dx;
                this.data.y = initialY + dy;
                
                this.foreignObject.setAttribute('x', this.data.x);
                this.foreignObject.setAttribute('y', this.data.y);
            };

            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                // Update Store for persistence
                this.widget.store.updateNote(this.id, { x: this.data.x, y: this.data.y });
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });

        // Resize Logic (Similar adjust for K scale)
        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const k = this.widget.store.transform.k;
            const startW = this.data.width;
            const startH = this.data.height;

            const onMove = (me) => {
                const dx = (me.clientX - startX) / k;
                const dy = (me.clientY - startY) / k;
                
                this.data.width = Math.max(50, startW + dx);
                this.data.height = Math.max(40, startH + dy);
                this.updateView();
            };
            
            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                this.widget.store.updateNote(this.id, { width: this.data.width, height: this.data.height });
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });

        // Double Click Edit
        this.el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (this.widget.inlineEditor) {
                // Must pass the HTML element, InlineEditor handles overlays
                this.widget.inlineEditor.startInlineEditing(e, this.data.text, (val) => {
                    this.data.text = val;
                    this.widget.store.updateNote(this.id, { text: val });
                    this.updateView();
                }, this.widget.eventBus); // Pass eventBus
            }
        });
        
    }

    _openPropertiesPanel() {
        const config = {
            title: "Note Properties",
            fields: [
                { type: 'textarea', label: 'Text', value: this.data.text, name: 'text' },
                { type: 'color', label: 'Background', value: this.data.style.backgroundColor, name: 'backgroundColor' },
                { type: 'text', label: 'Font Size', value: this.data.style.fontSize, name: 'fontSize' }
            ],
            onApply: (formData) => {
                this.data.text = formData.text;
                this.data.style.backgroundColor = formData.backgroundColor;
                this.data.style.fontSize = formData.fontSize;
                this.widget.store.updateNote(this.id, { 
                    text: this.data.text, 
                    style: this.data.style 
                });
                this.updateView();
            },
            onDelete: () => {
                this.widget.dispatch('delete_note', { noteId: this.id });
            }
        };
        this.widget.eventBus.emit('OPEN_PROPERTIES', config);
    }
}