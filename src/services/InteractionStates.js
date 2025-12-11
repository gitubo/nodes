import { snapToGrid } from '../core/config.js';
import { findClosestTOnPath } from '../render/geometry.js';

// Base State
class InteractionState {
    constructor(context) { this.ctx = context; }
    onMouseDown(e) {}
    onMouseMove(e) {}
    onMouseUp(e) {}
}

// 1. Idle State: Waiting for input
export class IdleState extends InteractionState {
    onMouseDown(e) {
        const target = e.target;
        const nodeEl = target.closest('.node');
        const handlerEl = target.closest('.handler-g');
        const labelEl = target.closest('.link-label-group');
        
        if (handlerEl) {
            e.preventDefault();
            const d = d3.select(handlerEl).datum();
            // Transition to Connection State
            this.ctx.setState(new ConnectionCreationState(this.ctx, d));
            return;
        }
        
        if (nodeEl) {
            const d = d3.select(nodeEl).datum();
            this.ctx.store.selection.select('node', d);
            // Transition to Drag State
            this.ctx.setState(new NodeDragState(this.ctx, d, this.ctx.getMousePos(e)));
            return;
        }

        if (labelEl) {
            // Find the link datum associated with the label element
            const linkData = d3.select(labelEl).datum();
            // Transition to Link Label Drag State
            this.ctx.setState(new LinkLabelDragState(this.ctx, linkData, this.ctx.getMousePos(e)));
            return;
        }

        // Background click
        this.ctx.store.selection.deselect();
    }
}

// 2. Node Dragging State
export class NodeDragState extends InteractionState {
    constructor(context, node, startMouse) {
        super(context);
        this.node = node;
        this.initialPos = { ...node.position };
        this.startMouse = startMouse;
        
        d3.select(`.node[data-id="${node.id}"]`).classed("dragging", true);
    }

    onMouseMove(e) {
        const currentMouse = this.ctx.getMousePos(e);
        const dx = currentMouse.x - this.startMouse.x;
        const dy = currentMouse.y - this.startMouse.y;
        
        // 1. CRITICAL FIX: Update Store with the raw, UN-SNAPPED position 
        // This ensures smooth visual movement and high-frequency link update.
        this.ctx.store.updateNodePosition(
            this.node.id, 
            this.initialPos.x + dx, // Calculate the free-moving X
            this.initialPos.y + dy  // Calculate the free-moving Y
        );
    }

    onMouseUp(e) {
        // The position in this.node.position is the last UN-SNAPPED position.
        const freeMovingPos = this.node.position;
        
        // 2. CRITICAL FIX: Apply snapToGrid only on release
        const snappedX = snapToGrid(freeMovingPos.x);
        const snappedY = snapToGrid(freeMovingPos.y);

        const finalSnappedPos = { x: snappedX, y: snappedY };

        // 3. Update Store with the final snapped position one last time.
        // This visually "snaps" the node to the grid.
        this.ctx.store.updateNodePosition(
            this.node.id, 
            finalSnappedPos.x,
            finalSnappedPos.y
        );

        // 4. Commit to history. This emits the 'NODE_MOVED' event.
        this.ctx.store.commitNodePosition(this.node.id, this.initialPos, finalSnappedPos);
        
        d3.select(`.node[data-id="${this.node.id}"]`).classed("dragging", false);
        this.ctx.setState(new IdleState(this.ctx));
    }
}

// 3. Connection Creation State
export class ConnectionCreationState extends InteractionState {
    constructor(context, sourceHandler) {
        super(context);
        this.sourceHandler = sourceHandler;
    }

    onMouseMove(e) {
        const mouse = this.ctx.getMousePos(e);
        this.ctx.store.setGhostLink({
            sourceHandlerId: this.sourceHandler.id,
            targetX: mouse.x,
            targetY: mouse.y
        });
    }

    onMouseUp(e) {
        const target = e.target.closest('.handler-g');
        if (target) {
            const targetData = d3.select(target).datum();
            // Logic to validate connection (Source -> Target)
            if (targetData.role !== this.sourceHandler.role) {
                this.ctx.store.addLink(this.sourceHandler.id, targetData.id);
            }
        }
        
        this.ctx.store.setGhostLink(null);
        this.ctx.setState(new IdleState(this.ctx));
    }
}

export class LinkLabelDragState extends InteractionState {
    constructor(context, link, startMouse) {
        super(context);
        this.link = link;
        // Start dragging
    }

    onMouseMove(e) {
        const currentMouse = this.ctx.getMousePos(e);
        
        // Calculate the closest 't' (0.0 - 1.0) on the bezier curve to the mouse cursor
        const newT = findClosestTOnPath(
            this.link, 
            currentMouse, 
            this.ctx.store.state.nodes, 
            this.ctx.store.registry
        );

        // Update with the normalized float value
        this.ctx.store.updateLinkLabelOffset(this.link.id, newT);
    }

    onMouseUp(e) {
        this.ctx.store.commitLinkUpdate(this.link.id); 
        this.ctx.setState(new IdleState(this.ctx));
    }
}