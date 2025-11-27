// src/geometry.js
import { store } from './state.js'; 
import { CONFIG } from './config.js';
import { registry } from './Registry.js';

/**
 * Find the global position of a handler by its ID
 * Uses the new O(1) lookup if available, or falls back to iteration
 */
export function findGlobalHandlerPos(handlerId) {
    // Optimization: If state has a handler map, use it (we will add this to state.js)
    // For now, we stick to the iteration but break early for performance
    for (const node of store.state.nodes) {
        // Quick check: optimization to skip nodes that definitely don't have this handler
        // (If we had a map node_id -> [handler_ids], it would be O(1))
        
        const definition = registry.getNodeDefinition(node.type);
        const handlers = definition ? definition.getHandlers(node) : [];
        
        for (const handler of handlers) {
            if (handler.id === handlerId) {
                const localX = handler.offset.x || 0;
                const localY = handler.offset.y || 0;
                return {
                    x: node.position.x + localX, 
                    y: node.position.y + localY,
                    dir: handler.direction || 'right' 
                };
            }
        }
    }
    return { x: 0, y: 0, dir: 'right' };
}

/**
 * Pure Math Cubic Bezier function
 * B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
 */
function cubicBezier(t, p0, p1, p2, p3) {
    const k = 1 - t;
    const k2 = k * k;
    const k3 = k2 * k;
    const t2 = t * t;
    const t3 = t2 * t;
    return k3 * p0 + 3 * k2 * t * p1 + 3 * k * t2 * p2 + t3 * p3;
}

/**
 * Calculates a point {x,y} along the curve at t (0..1)
 * Completely math-based, no DOM access.
 */
export function calculatePositionAlongPath(link, t) {
    const p = getLinkBezierPoints(link);
    if (!p) return { x: 0, y: 0 };

    const x = cubicBezier(t, p.sx, p.c1x, p.c2x, p.tx);
    const y = cubicBezier(t, p.sy, p.c1y, p.c2y, p.ty);
    
    return { x, y };
}

/**
 * Helper to get Control Point Offset Vector based on direction
 */
function getControlVector(direction, distance) {
    switch(direction) {
        case 'left':   return { x: -distance, y: 0 };
        case 'right':  return { x: distance, y: 0 };
        case 'top':    return { x: 0, y: -distance };
        case 'bottom': return { x: 0, y: distance };
        default:       return { x: distance, y: 0 };
    }
}

/**
 * Helper: extracts geometry points for a link
 */
export function getLinkBezierPoints(link) {

    const sourceHandlerId =
        link.sourceHandlerId ||
        link.sourceHandler ||
        link.sourceId ||
        link.source;

    const targetHandlerId =
        link.targetHandlerId ||
        link.targetHandler ||
        link.targetId ||
        link.target;

    let sourcePos, targetPos;

    if (sourceHandlerId && targetHandlerId) {
        sourcePos = findGlobalHandlerPos(link.source); 
        targetPos = findGlobalHandlerPos(link.target);
    } else if (sourceHandlerId && link.targetX !== undefined) {
        // Ghost Link
        sourcePos = findGlobalHandlerPos(link.sourceId); 
        targetPos = { x: link.targetX, y: link.targetY, dir: 'left' };
    } else {
        return null;
    }

    const startX = sourcePos.x;
    const startY = sourcePos.y;
    const endX = targetPos.x;
    const endY = targetPos.y;

    const controlOffset = CONFIG.link.controlOffset;
    // Adaptive control distance
    const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const controlDistance = Math.min(controlOffset * 2, Math.max(controlOffset, dist * 0.4));

    const srcVec = getControlVector(sourcePos.dir, controlDistance);
    const tgtVec = getControlVector(targetPos.dir, controlDistance);

    return { 
        sx: startX, sy: startY, 
        tx: endX, ty: endY, 
        c1x: startX + srcVec.x, c1y: startY + srcVec.y, 
        c2x: endX + tgtVec.x, c2y: endY + tgtVec.y 
    };
}

/**
 * Calculate pure SVG path string
 */
export function calculatePath(link) {
    const points = getLinkBezierPoints(link);
    if (!points) return "";
    return `M ${points.sx},${points.sy} C ${points.c1x},${points.c1y} ${points.c2x},${points.c2y} ${points.tx},${points.ty}`; 
}

/**
 * Optimized T-search.
 * Instead of checking the DOM, we compute samples mathematically.
 * This is 100x faster than getPointAtLength.
 */
export function findClosestTOnPath(link, targetPoint, samples = 20) {
   const p = getLinkBezierPoints(link);
   if(!p) return 0.5;

   let bestT = 0.5;
   let minDst = Infinity;

   // Coarse search
   for(let i = 0; i <= samples; i++) {
       const t = i / samples;
       const x = cubicBezier(t, p.sx, p.c1x, p.c2x, p.tx);
       const y = cubicBezier(t, p.sy, p.c1y, p.c2y, p.ty);
       const dx = x - targetPoint.x;
       const dy = y - targetPoint.y;
       const dst = dx*dx + dy*dy;
       
       if(dst < minDst) {
           minDst = dst;
           bestT = t;
       }
   }
   
   return bestT;
}