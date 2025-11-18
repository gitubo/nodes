// geometry.js - Geometry utilities
import { state } from './state.js';
import { registry } from './Registry.js';
import { CONFIG } from './config.js';

/**
 * Find the global position of a handler by its ID
 * @param {string} handlerId - Handler ID
 * @returns {Object} {x, y} global coordinates
 */
export function findGlobalHandlerPos(handlerId) {
    for (const node of state.nodes) {
        const handler = node.handlers.find(h => h.id === handlerId);
        if (handler) {
            const handlerDef = registry.getHandlerDefinition(handler.type);
            if (!handlerDef) return { x: node.x, y: node.y };
            
            const localPos = handlerDef.calculatePosition(handler);
            return {
                x: node.x + localPos.x,
                y: node.y + localPos.y
            };
        }
    }
    return { x: 0, y: 0 };
}

/**
 * Calculate bezier path between two points
 * @param {Object} link - Link object with sourceId/targetId or sourceId/targetX/targetY
 * @returns {string} SVG path 'd' attribute
 */
export function calculatePath(link) {
    let sourcePos, targetPos;
    
    if (link.sourceId && link.targetId) {
        sourcePos = findGlobalHandlerPos(link.sourceId);
        targetPos = findGlobalHandlerPos(link.targetId);
    } else if (link.sourceId && link.targetX !== undefined) {
        sourcePos = findGlobalHandlerPos(link.sourceId);
        targetPos = { x: link.targetX, y: link.targetY };
    } else {
        return "";
    }
    
    const startX = sourcePos.x;
    const startY = sourcePos.y;
    const endX = targetPos.x;
    const endY = targetPos.y;
    
    const controlOffset = CONFIG.link.controlOffset;
    const midX = (startX + endX) / 2;
    const controlDistance = Math.max(controlOffset, Math.abs(midX - startX));
    
    let c1x, c2x;
    if (startX <= endX) {
        c1x = startX + controlDistance;
        c2x = endX - controlDistance;
    } else {
        c1x = startX + controlDistance;
        c2x = endX - controlDistance;
    }
    
    return `M ${startX},${startY} C ${c1x},${startY} ${c2x},${endY} ${endX},${endY}`;
}