import { IdleState } from './InteractionStates.js';
import { startInlineEditing } from '../components/InlineEditor.js';

export class InputSystem {
    constructor(svgElement, store, eventBus) {
        this.svg = d3.select(svgElement);
        this.store = store;
        this.eventBus = eventBus;
        this.viewport = this.svg.select("g.viewport");
        
        // Initial State
        this.currentState = new IdleState(this);
    }

    setState(newState) {
        this.currentState = newState;
    }

    attachEvents() {
        // Use arrow functions to preserve 'this' context
        this.svg.on("mousedown", (e) => {
            // Forward to State
            this.currentState.onMouseDown(e);
            
            // Global Drag Listeners (attached only when needed could be optimized further)
            d3.select(window)
                .on("mousemove.input", (evt) => this.currentState.onMouseMove(evt))
                .on("mouseup.input", (evt) => this.currentState.onMouseUp(evt));
        });
        
        this.svg.on("dblclick", (e) => {
            const target = e.target;
            // Check if we clicked a link label group or its text/bg
            const labelGroup = target.closest('.link-label-group');
            
            if (labelGroup) {
                e.stopPropagation();
                e.preventDefault();
                
                const linkData = d3.select(labelGroup).datum();
                // Get current text safely
                const currentText = linkData.label?.text || "";

                startInlineEditing(e, currentText, (newValue) => {
                    // Update the link in the store
                    this.store.updateLink(linkData.id, {
                        label: { ...linkData.label, text: newValue }
                    });
                }, this.eventBus);
            }
        });

        // Context Menu is usually independent of drag state, can stay here or be its own strategy
        this.svg.on("contextmenu", (e) => this.handleContextMenu(e));
    }

    getMousePos(event) {
        // D3 pointer returns [x, y] relative to viewport container
        const [x, y] = d3.pointer(event, this.viewport.node());
        return { x, y };
    }
    
    handleContextMenu(event) {
        const target = event.target;
        const nodeElement = target.closest('.node');
        // FIX 4: Check for .link-group to support clicking on the stroke or the hitarea
        const linkGroup = target.closest('.link-group');
        const handlerElement = target.closest('.handler-g');
        const noteElement = target.closest('.note'); // 1. Detect Note

        if (handlerElement) {
            event.preventDefault();
            event.stopPropagation();
            const d = d3.select(handlerElement).datum();
            import('../components/ContextMenu.js').then(m => m.showHandlerContextMenu(event, d, this.eventBus, this.store));
        } else if (linkGroup) {
            event.preventDefault(); 
            event.stopPropagation();
            const d = d3.select(linkGroup).datum();
            import('../components/ContextMenu.js').then(m => m.showLinkContextMenu(event, d, this.eventBus, this.store));
        } else if (nodeElement) {
            event.preventDefault(); 
            event.stopPropagation();
            const d = d3.select(nodeElement).datum();
            import('../components/ContextMenu.js').then(m => m.showNodeContextMenu(event, d, this.eventBus, this.store));
        } else if (noteElement) { 
            // 2. Handle Note Context Menu
            event.preventDefault(); 
            event.stopPropagation();
            
            // Notes are HTML elements; we need to find the data object using the ID
            const noteId = noteElement.id; 
            const noteData = this.store.state.notes.find(n => n.id === noteId);

            if (noteData) {
                 import('../components/ContextMenu.js').then(m => {
                     // Ensure showNoteContextMenu exists (see step 5)
                     if (m.showNoteContextMenu) {
                         m.showNoteContextMenu(event, noteData, this.eventBus, this.store);
                     }
                 });
            }
        }
    }
}