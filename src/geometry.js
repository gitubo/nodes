// src/geometry.js
import { state } from './state.js'; 
import { CONFIG } from './config.js';
import { registry } from './Registry.js';

/**
 * Find the global position of a handler by its ID
 */
export function findGlobalHandlerPos(handlerId) {
    for (const node of state.nodes) { 
        const definition = registry.getNodeDefinition(node.type);
        const handlers = definition ? definition.getHandlers(node) : [];
        
        const handler = handlers.find(h => h.id === handlerId);
        if (handler) {
            const localX = handler.offset.x || 0;
            const localY = handler.offset.y || 0;
            return {
                x: node.position.x + localX, 
                y: node.position.y + localY
            };
        }
    }
    return { x: 0, y: 0 };
}

/**
 * Helper: extracts geometry points for a link
 * Returns { sx, sy, tx, ty, c1x, c1y, c2x, c2y }
 */
function getLinkBezierPoints(link) {
    let sourcePos, targetPos;

    // 1. Resolve Start/End positions
    if (link.source && link.target) {
        sourcePos = findGlobalHandlerPos(link.source); 
        targetPos = findGlobalHandlerPos(link.target);
    } else if (link.sourceId && link.targetX !== undefined) {
        // Ghost link handling
        sourcePos = findGlobalHandlerPos(link.sourceId); 
        targetPos = { x: link.targetX, y: link.targetY };
    } else {
        return null;
    }

    const startX = sourcePos.x;
    const startY = sourcePos.y;
    const endX = targetPos.x;
    const endY = targetPos.y;

    // 2. Calculate Control Points
    const controlOffset = CONFIG.link.controlOffset;
    // Adaptive control distance ensures curves don't look weird on short distances
    const midX = (startX + endX) / 2;
    const controlDistance = Math.max(controlOffset, Math.abs(midX - startX));

    let c1x, c2x;
    // Logic for forward vs backward connections (S-curves)
    if (startX <= endX) {
        c1x = startX + controlDistance; 
        c2x = endX - controlDistance;
    } else {
        c1x = startX + controlDistance; 
        c2x = endX - controlDistance;
    }

    return { sx: startX, sy: startY, tx: endX, ty: endY, c1x, c1y: startY, c2x, c2y: endY };
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
 * Optimized position calculator - No DOM access
 * @param {Object} link - The Link Object (NOT path string)
 * @param {number} t - Normalized distance (0.0 to 1.0)
 */
export function calculatePositionAlongPath(link, t) {
    const p = getLinkBezierPoints(link);
    if (!p) return { x: 0, y: 0 };

    const x = cubicBezier(t, p.sx, p.c1x, p.c2x, p.tx);
    const y = cubicBezier(t, p.sy, p.c1y, p.c2y, p.ty);
    
    return { x, y };
}

/**
 * Find t where point is closest to curve (Mathematical Approximation)
 * Replaces the heavy iteration in render.js
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
   
   // Optional: Refine search around bestT could be added here for precision
   return bestT;
}