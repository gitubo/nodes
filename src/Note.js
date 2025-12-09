export class Note {
    constructor(id, data, widget) {
        this.id = id;
        this.widget = widget; // Reference to main widget for EventBus/Layers
        this.el = null;
        this.labelEl = null;

        // Default Data Model
        this.data = {
            x: data.x || 0,
            y: data.y || 0,
            width: data.width || 150,
            height: data.height || 100,
            text: data.text || "New Note",
            style: {
                backgroundColor: data.style?.backgroundColor || "#fff9c4",
                color: data.style?.color || "#333333",
                fontSize: data.style?.fontSize || "12px",
                fontStyle: data.style?.fontStyle || "normal" // normal, italic, oblique
            }
        };

        this.render();
    }

    render() {
        // 1. Create Container
        this.el = document.createElement('div');
        this.el.className = 'note';
        this.el.id = this.id;
        
        // 2. Create Label
        this.labelEl = document.createElement('div');
        this.labelEl.className = 'note-label';
        this.el.appendChild(this.labelEl);

        // 3. Create Resize Handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'note-resize-handle';
        this.el.appendChild(resizeHandle);

        // 4. Initial Visual Update
        this.updateView();

        // 5. Append to the specific NOTES LAYER (not the generic container)
        // This ensures Z-Index correctness (Grid < Notes < Connections < Nodes)
        this.widget.layers.notes.appendChild(this.el);

        // 6. Attach Events
        this._attachEvents(resizeHandle);
    }

    updateView() {
        // Geometry
        this.el.style.left = `${this.data.x}px`;
        this.el.style.top = `${this.data.y}px`;
        this.el.style.width = `${this.data.width}px`;
        this.el.style.height = `${this.data.height}px`;

        // Styling
        this.el.style.backgroundColor = this.data.style.backgroundColor;
        
        // Label Styling
        this.labelEl.innerText = this.data.text;
        this.labelEl.style.color = this.data.style.color;
        this.labelEl.style.fontSize = this.data.style.fontSize;
        this.labelEl.style.fontStyle = this.data.style.fontStyle;
    }

    _attachEvents(resizeHandle) {
        // --- Dragging Logic ---
        this.el.addEventListener('mousedown', (e) => {
            // If clicking the resize handle, ignore drag
            if(e.target === resizeHandle) return; 
            
            // Left click only
            if(e.button !== 0) return;

            e.stopPropagation(); // Don't drag the grid canvas
            this._handleDrag(e);
        });

        // --- Resizing Logic ---
        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent text selection
            this._handleResize(e);
        });

        // --- Double Click (Inline Edit) ---
        this.el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this._startInlineEdit();
        });

        // --- Context Menu ---
        this.el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._showContextMenu(e);
        });
    }

    _handleDrag(e) {
        const startX = e.clientX;
        const startY = e.clientY;
        const initialLeft = this.data.x;
        const initialTop = this.data.y;

        const onMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            
            // Update local data
            this.data.x = initialLeft + dx;
            this.data.y = initialTop + dy;
            
            // Update specific CSS property for performance
            this.el.style.left = `${this.data.x}px`;
            this.el.style.top = `${this.data.y}px`;
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            // Optional: Dispatch 'NOTE_MOVED' event here for history/undo
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    _handleResize(e) {
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = this.data.width;
        const startH = this.data.height;

        const onMove = (moveEvent) => {
            // Enforce minimum size (e.g., 50x30)
            this.data.width = Math.max(50, startW + (moveEvent.clientX - startX));
            this.data.height = Math.max(30, startH + (moveEvent.clientY - startY));
            
            this.el.style.width = `${this.data.width}px`;
            this.el.style.height = `${this.data.height}px`;
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    _startInlineEdit() {
        // Reuse existing InlineEditor
        if (this.widget.inlineEditor) {
            this.widget.inlineEditor.edit(this.el, this.data.text, (newText) => {
                this.data.text = newText;
                this.updateView();
            });
        }
    }

    _showContextMenu(e) {
        const actions = [
            { 
                label: 'Edit Label', 
                action: () => this._startInlineEdit() 
            },
            { 
                label: 'Properties', 
                action: () => this._openPropertiesPanel() 
            },
            { 
                label: 'Remove Label', 
                action: () => { 
                    this.data.text = ""; 
                    this.updateView(); 
                } 
            }
        ];

        // Reuse existing ContextMenu singleton
        if(this.widget.contextMenu) {
            this.widget.contextMenu.show(e.clientX, e.clientY, actions);
        }
    }

    _openPropertiesPanel() {
        const config = {
            title: "Note Properties",
            fields: [
                { type: 'textarea', label: 'Label Text', value: this.data.text, name: 'text' },
                { type: 'color', label: 'Background Color', value: this.data.style.backgroundColor, name: 'backgroundColor' },
                { type: 'color', label: 'Font Color', value: this.data.style.color, name: 'fontColor' },
                { type: 'number', label: 'Font Size (px)', value: parseInt(this.data.style.fontSize), name: 'fontSize' },
                { type: 'select', label: 'Font Style', value: this.data.style.fontStyle, name: 'fontStyle', options: ['normal', 'italic', 'oblique', 'bold'] }
            ],
            // Buttons logic passed as callbacks
            onApply: (formData) => {
                this.data.text = formData.text;
                this.data.style.backgroundColor = formData.backgroundColor;
                this.data.style.color = formData.fontColor;
                this.data.style.fontSize = formData.fontSize + "px";
                this.data.style.fontStyle = formData.fontStyle;
                this.updateView();
                
                // Close panel
                this.widget.propertiesPanel.hide();
            },
            onCancel: () => {
                this.widget.propertiesPanel.hide();
            },
            onDelete: () => {
                // Execute through widget command to ensure undo/redo and proper cleanup
                this.widget.executeCommand('delete_note', { noteId: this.id });
                this.widget.propertiesPanel.hide();
            }
        };

        if(this.widget.propertiesPanel) {
            this.widget.propertiesPanel.show(config);
        }
    }

    destroy() {
        if(this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
    }
}