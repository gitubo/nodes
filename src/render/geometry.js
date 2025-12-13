// src/geometry.js
import { CONFIG } from '../core/config.js';

/**
 * Find the global position of a handler by its ID
 * @param {string} handlerId - The ID of the handler to find.
 * @param {Array} nodes - The array of node objects (from store.state.nodes).
 * @param {Registry} registry - The node definition registry.
 */
export function findGlobalHandlerPos(handlerId, nodes, registry, storeCache) {
    // 1. FAST PATH: Check cache
    if (storeCache && storeCache.handlerAbsPos.has(handlerId)) {
        return storeCache.handlerAbsPos.get(handlerId);
    }

    // 2. SLOW PATH: Fallback (Legacy logic) [cite: 688-692]
    for (const node of nodes) {
        for (const handler of node.handlers) {
            if (handler.id === handlerId) {
                return {
                    x: node.position.x + handler.offset.x, 
                    y: node.position.y + handler.offset.y,
                    dir: handler.direction
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
export function calculatePositionAlongPath(link, t, nodes, registry) {
    const p = getLinkBezierPoints(link, nodes, registry);
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
export function getLinkBezierPoints(link, nodes, registry) {

    const sourceHandlerId =
        link.sourceHandlerId ||
        link.sourceHandler ||
        link.sourceId;

    const targetHandlerId =
        link.targetHandlerId ||
        link.targetHandler ||
        link.targetId;
        
    let sourcePos, targetPos;

    if (sourceHandlerId && targetHandlerId) {
        sourcePos = findGlobalHandlerPos(sourceHandlerId, nodes, registry);
        targetPos = findGlobalHandlerPos(targetHandlerId, nodes, registry);
    } else if (sourceHandlerId && link.targetX !== undefined) {
        // Ghost Link
        sourcePos = findGlobalHandlerPos(sourceHandlerId, nodes, registry);
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
export function calculatePath(link, nodes, registry) {
    const points = getLinkBezierPoints(link, nodes, registry);
    if (!points) return "";
    return `M ${points.sx},${points.sy} C ${points.c1x},${points.c1y} ${points.c2x},${points.c2y} ${points.tx},${points.ty}`; 
}

/**
 * Optimized T-search.
 * Instead of checking the DOM, we compute samples mathematically.
 */
export function findClosestTOnPath(link, targetPoint, nodes, registry, samples = 20) {
   const p = getLinkBezierPoints(link, nodes, registry);
   if(!p) return 0.5;
   
   let bestT = 0.5;
   let minDst = Infinity;
   
   // 1. Coarse Search (existing logic)
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

   // 2. NEW: Binary Search Refinement for smooth movement
   // Search in the range [bestT - step, bestT + step]
   let step = 1 / samples; 
   let currentT = bestT;
   
   // 6 iterations gives significant precision increase
   for(let i = 0; i < 6; i++) {
       step /= 2;
       // Check t - step
       const tLeft = Math.max(0, currentT - step);
       const xL = cubicBezier(tLeft, p.sx, p.c1x, p.c2x, p.tx);
       const yL = cubicBezier(tLeft, p.sy, p.c1y, p.c2y, p.ty);
       const dstL = (xL - targetPoint.x)**2 + (yL - targetPoint.y)**2;

       // Check t + step
       const tRight = Math.min(1, currentT + step);
       const xR = cubicBezier(tRight, p.sx, p.c1x, p.c2x, p.tx);
       const yR = cubicBezier(tRight, p.sy, p.c1y, p.c2y, p.ty);
       const dstR = (xR - targetPoint.x)**2 + (yR - targetPoint.y)**2;

       if (dstL < minDst) {
           minDst = dstL;
           currentT = tLeft;
       } else if (dstR < minDst) {
           minDst = dstR;
           currentT = tRight;
       }
   }
   
   return currentT;
}