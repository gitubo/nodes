// src/render/geometry.js
import { CONFIG } from '../core/config.js';

// 1. Singleton hidden path for calculations
const _workPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

/**
 * Calculates the SVG Path string (D attribute).
 * We still need the basic Bezier math to DRAW the line, 
 * but we don't need it for point sampling anymore.
 */
export function calculatePath(link, nodes, registry) {
    const points = getLinkBezierPoints(link, nodes, registry);
    if (!points) return "";
    return `M ${points.sx},${points.sy} C ${points.c1x},${points.c1y} ${points.c2x},${points.c2y} ${points.tx},${points.ty}`; 
}

/**
 * NATIVE MATH REPLACEMENT:
 * Uses getPointAtLength instead of custom Cubic Bezier math.
 */
export function calculatePositionAlongPath(link, t, nodes, registry) {
    const d = calculatePath(link, nodes, registry);
    
    // Set the path data to our hidden worker element
    _workPath.setAttribute('d', d);
    
    const len = _workPath.getTotalLength();
    // Clamp t between 0 and 1
    const clampedT = Math.max(0, Math.min(1, t));
    
    return _workPath.getPointAtLength(len * clampedT);
}

/**
 * REPLACEMENT:
 * Finds the 't' (0-1) closest to a target point.
 * We use a simplified scan over the native path length.
 */
export function findClosestTOnPath(link, targetPoint, nodes, registry, precision = 20) {
    const d = calculatePath(link, nodes, registry);
    _workPath.setAttribute('d', d);
    
    const totalLength = _workPath.getTotalLength();
    let bestDist = Infinity;
    let bestT = 0.5;

    // Scan the path using native points
    for (let i = 0; i <= precision; i++) {
        const t = i / precision;
        const p = _workPath.getPointAtLength(totalLength * t);
        const dx = p.x - targetPoint.x;
        const dy = p.y - targetPoint.y;
        const dist = dx * dx + dy * dy;
        
        if (dist < bestDist) {
            bestDist = dist;
            bestT = t;
        }
    }
    return bestT;
}

// --- Helper Functions (Kept for calculating Control Points) ---

export function findGlobalHandlerPos(handlerId, nodes, registry, storeCache) {
    if (storeCache && storeCache.handlerAbsPos.has(handlerId)) {
        return storeCache.handlerAbsPos.get(handlerId);
    }
    // Fallback lookup
    for (const node of nodes) {
        for (const handler of node.handlers) {
            if (handler.id === handlerId) {
                return {
                    x: node.position.x + (handler.offset.x || 0), 
                    y: node.position.y + (handler.offset.y || 0),
                    dir: handler.direction || 'right'
                };
            }
        }
    }
    return { x: 0, y: 0, dir: 'right' };
}

function getLinkBezierPoints(link, nodes, registry) {
    // ... (Keep existing implementation from source 804-814) ...
    const sourceHandlerId = link.sourceHandlerId || link.sourceHandler || link.sourceId;
    const targetHandlerId = link.targetHandlerId || link.targetHandler || link.targetId;
    
    let sourcePos, targetPos;

    if (sourceHandlerId && targetHandlerId) {
        sourcePos = findGlobalHandlerPos(sourceHandlerId, nodes, registry);
        targetPos = findGlobalHandlerPos(targetHandlerId, nodes, registry);
    } else if (sourceHandlerId && link.targetX !== undefined) {
        // Ghost Link logic
        sourcePos = findGlobalHandlerPos(sourceHandlerId, nodes, registry);
        targetPos = { x: link.targetX, y: link.targetY, dir: 'left' };
    } else {
        return null;
    }

    // Protection against missing positions
    if (!sourcePos || !targetPos) return null;

    const startX = sourcePos.x;
    const startY = sourcePos.y;
    const endX = targetPos.x;
    const endY = targetPos.y;

    const controlOffset = CONFIG.link.controlOffset;
    const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const controlDistance = Math.min(controlOffset * 2, Math.max(controlOffset, dist * 0.4));

    const getControlVector = (dir, dist) => {
        if(dir === 'left') return { x: -dist, y: 0 };
        if(dir === 'right') return { x: dist, y: 0 };
        if(dir === 'top') return { x: 0, y: -dist };
        if(dir === 'bottom') return { x: 0, y: dist };
        return { x: dist, y: 0 };
    };

    const srcVec = getControlVector(sourcePos.dir, controlDistance);
    const tgtVec = getControlVector(targetPos.dir, controlDistance);

    return { 
        sx: startX, sy: startY, 
        tx: endX, ty: endY, 
        c1x: startX + srcVec.x, c1y: startY + srcVec.y, 
        c2x: endX + tgtVec.x, c2y: endY + tgtVec.y 
    };
}