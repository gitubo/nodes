import { snapToGrid } from './config.js';
import { startInlineEditing } from './InlineEditor.js';
import { findClosestTOnPath } from './geometry.js';

export class InputSystem {
    constructor(svgElement, store, eventBus, registry) {
        this.svg = d3.select(svgElement);
        this.viewport = this.svg.select("g.viewport");
        this.store = store;
        this.eventBus = eventBus;
        this.registry = registry;
        
        this.dragState = null;
        
        // Bind methods to this for adding/removing listeners
        this.handleMove = this.handleMove.bind(this);
        this.handleUp = this.handleUp.bind(this);
    }

    attachEvents() {
        // Mousedown stays on the SVG container
        this.svg
            .on("mousedown.input", (e) => this.handleDown(e))
            .on("click.input", (e) => this.handleClick(e))
            .on("dblclick.input", (e) => this.handleDblClick(e))
            .on("contextmenu.input", (e) => this.handleContextMenu(e));
    }

    _getMousePosition(event) {
        // D3 pointer returns [x, y] relative to the specified node
        return d3.pointer(event, this.viewport.node());
    }

    handleDown(event) {
        // 1. Check strict targets first
        const target = event.target;
        const [mouseX, mouseY] = this._getMousePosition(event);
        
        const nodeElement = target.closest('.node');
        const handlerElement = target.closest('.handler-g');
        const labelElement = target.closest('.link-label-group');

        // Only left-click triggers drag
        if (event.button !== 0) return; 

        let dragging = false;

        if (handlerElement) {
            event.stopPropagation();
            const handlerData = d3.select(handlerElement).datum();
            if (!handlerData) return;

            if (handlerData.role === 'source') {
                this.dragState = { type: 'handler_source', id: handlerData.id };
                this.store.setGhostLink({
                    sourceHandlerId: handlerData.id,
                    targetX: mouseX,
                    targetY: mouseY,
                    reversed: false
                });
                dragging = true;
            } else if (handlerData.role === 'target') {
                const existingLink = this.store.links.find(l => l.targetHandlerId === handlerData.id);
                if (existingLink) {
                    // Reconnect logic
                    this.store.removeLink(existingLink.id, true); // Soft remove
                    this.store.setDisconnectingLink(existingLink);
                    this.dragState = { type: 'handler_reconnect', id: existingLink.sourceHandlerId };
                    this.store.setGhostLink({
                        sourceHandlerId: existingLink.sourceHandlerId,
                        targetX: mouseX,
                        targetY: mouseY,
                        reversed: false
                    });
                    dragging = true;
                } else {
                    // Reverse connection logic
                    this.dragState = { type: 'handler_target', id: handlerData.id };
                    this.store.setGhostLink({
                        sourceHandlerId: handlerData.id,
                        targetX: mouseX,
                        targetY: mouseY,
                        reversed: true
                    });
                    dragging = true;
                }
            }
        } else if (nodeElement) {
            event.stopPropagation();
            const nodeData = d3.select(nodeElement).datum();
            if (!nodeData) return;
            
            d3.select(nodeElement).raise().classed("dragging", true);
            this.store.selectObject('node', nodeData);
            
            this.dragState = {
                type: 'node',
                id: nodeData.id,
                startPos: { x: mouseX, y: mouseY },
                initialNodePos: { x: nodeData.position.x, y: nodeData.position.y }
            };
            dragging = true;
        } else if (labelElement) {
            event.stopPropagation();
            const labelData = d3.select(labelElement).datum();
            this.dragState = { type: 'label', id: labelData.id };
            d3.select(labelElement).classed("dragging", true);
            dragging = true;
        } else {
            // Clicked background -> deselect
            this.store.deselect();
        }

        if (dragging) {
            // Attach temporary listeners to WINDOW to track drag even outside canvas
            d3.select(window)
                .on("mousemove.drag", this.handleMove)
                .on("mouseup.drag", this.handleUp);
        }
    }

    handleMove(event) {
        if (!this.dragState) return;
        
        // Prevent default browser selection behaviors
        event.preventDefault();

        // Get coordinates relative to the viewport, even if mouse is outside
        const [mouseX, mouseY] = this._getMousePosition(event);

        if (this.dragState.type === 'node') {
            const dx = mouseX - this.dragState.startPos.x;
            const dy = mouseY - this.dragState.startPos.y;
            const newX = this.dragState.initialNodePos.x + dx;
            const newY = this.dragState.initialNodePos.y + dy;
            
            // High-frequency update without history
            this.store.moveNode(this.dragState.id, newX, newY);
            
        } else if (this.dragState.type.startsWith('handler_')) {
            // Update ghost link
            this.store.setGhostLink({
                ...this.store.ui.ghostLink,
                targetX: mouseX,
                targetY: mouseY
            });
            
        } else if (this.dragState.type === 'label') {
            const link = this.store.getLink(this.dragState.id);
            if (link && link.label) {
                const newT = findClosestTOnPath(link, {x: mouseX, y: mouseY}, this.store.state.nodes, this.registry);
                link.label.offset = newT;
                link.label.offsetX = 0;
                link.label.offsetY = 0;
                this.eventBus.emit('GHOST_LINK_UPDATED'); // Force partial redraw
            }
        }
    }

    handleUp(event) {
        if (!this.dragState) return;
        
        const targetElement = event.target; // The DOM element under cursor

        if (this.dragState.type === 'node') {
            const node = this.store.getNode(this.dragState.id);
            if (node) {
                const snappedX = snapToGrid(node.position.x);
                const snappedY = snapToGrid(node.position.y);
                
                d3.select(`.node[data-id="${node.id}"]`).classed("dragging", false);
                
                // Commit to history
                this.store.updateNodePosition(
                    node.id, 
                    this.dragState.initialNodePos, 
                    { x: snappedX, y: snappedY }
                );
            }
        } else if (this.dragState.type.startsWith('handler_')) {
            const targetHandlerElement = targetElement.closest('.handler-g');
            const ghost = this.store.ui.ghostLink;
            let linkAdded = false;

            if (targetHandlerElement && ghost) {
                const targetData = d3.select(targetHandlerElement).datum();
                // Validate connection logic
                if (targetData) {
                     if (targetData.role === 'target' && !ghost.reversed) {
                        this.store.addLink(ghost.sourceHandlerId, targetData.id, true);
                        linkAdded = true;
                    } else if (targetData.role === 'source' && ghost.reversed) {
                        this.store.addLink(targetData.id, ghost.sourceHandlerId, true);
                        linkAdded = true;
                    }
                }
            }
            
            const disconnecting = this.store.ui.disconnectingLink;
            if (disconnecting && !linkAdded) {
                // Restore if drag failed
                this.store.addLink(disconnecting.sourceHandlerId, disconnecting.targetHandlerId, false);
            }
            
            this.store.setGhostLink(null);
            this.store.setDisconnectingLink(null);
            this.eventBus.emit('STATE_UPDATED');

        } else if (this.dragState.type === 'label') {
            d3.select(`.link-label-group[data-id="${this.dragState.id}"]`).classed("dragging", false);
            const link = this.store.getLink(this.dragState.id);
            if (link) {
                this.store.updateLink(link.id, { label: { ...link.label } });
            }
        }

        // Cleanup
        this.dragState = null;
        d3.select(window).on("mousemove.drag", null).on("mouseup.drag", null);
    }
    
    handleClick(event) {
        const target = event.target;
        if (target.closest('.node')) {
            event.stopPropagation();
            // Selection handled in mousedown usually, but safe to keep here
        } else if (target.closest('.link-group')) {
            event.stopPropagation();
            const linkData = d3.select(target.closest('.link-group')).datum();
            this.store.selectObject('link', linkData);
        }
    }
    
    handleDblClick(event) {
        const target = event.target;
        if (target.matches('.link-label-text') || target.matches('.link-label-bg')) {
            event.stopPropagation();
            const d = d3.select(target.closest('.link-label-group')).datum();
            startInlineEditing(event, d.label.text, (val) => {
                 this.store.updateLink(d.id, { label: { ...d.label, text: val } });
            });
        }
        
        if (target.matches('.node-label')) {
            event.stopPropagation();
            const d = d3.select(target.closest('.node')).datum();
            startInlineEditing(event, d.label, (val) => {
                this.store.updateNode(d.id, { label: val });
            });
        }
    }
    
    handleContextMenu(event) {
        const target = event.target;
        const nodeElement = target.closest('.node');
        const linkElement = target.closest('.link-hitarea');
        const handlerElement = target.closest('.handler-g');

        // FIXED: Import path changed from '../ContextMenu.js' to './ContextMenu.js'
        if (handlerElement) {
            event.preventDefault(); event.stopPropagation();
            const d = d3.select(handlerElement).datum();
            import('./ContextMenu.js').then(m => m.showHandlerContextMenu(event, d));
        } else if (linkElement) {
            event.preventDefault(); event.stopPropagation();
            const d = d3.select(linkElement.closest('.link-group')).datum();
            import('./ContextMenu.js').then(m => m.showLinkContextMenu(event, d));
        } else if (nodeElement) {
            event.preventDefault(); event.stopPropagation();
            const d = d3.select(nodeElement).datum();
            import('./ContextMenu.js').then(m => m.showNodeContextMenu(event, d));
        }
    }
}