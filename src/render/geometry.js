//####################
// /src/render/geometry.js
// ####################

import { CONFIG } from '../core/config.js';

const _workPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

export const ConnectionPathType = Object.freeze({
    BEZIER: 'bezier',
    SMOOTH_STEP: 'smooth_step',
    STRAIGHT: 'straight'
});

// --- CONSTANTS ---
// Ensures the line travels straight for this distance before turning
const CLEARANCE = 40; 

// --- HELPER: Direction Vectors ---
function getDirVec(dir) {
    if (dir === 'left') return { x: -1, y: 0 };
    if (dir === 'right') return { x: 1, y: 0 };
    if (dir === 'top') return { x: 0, y: -1 };
    if (dir === 'bottom') return { x: 0, y: 1 };
    return { x: 1, y: 0 }; // Default
}

// --- HELPER: Check Axis ---
function isVertical(dir) {
    return dir === 'top' || dir === 'bottom';
}

function getOmniVector(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len === 0) return { x: 1, y: 0 }; // Fallback
    return { x: dx/len, y: dy/len };
}

// --- CORE ALGORITHM: Orthogonal Routing ---
function buildOrthogonalPoints(source, target) {
    const dir1 = getDirVec(source.direction);
    const dir2 = getDirVec(target.direction);

    // 1. Calculate "Escape Points" using CLEARANCE
    const p1 = { x: source.x, y: source.y };
    const start = { 
        x: p1.x + dir1.x * CLEARANCE, 
        y: p1.y + dir1.y * CLEARANCE 
    };

    const p2 = { x: target.x, y: target.y };
    const end = { 
        x: p2.x + dir2.x * CLEARANCE, 
        y: p2.y + dir2.y * CLEARANCE 
    };

    const points = [p1, start];
    
    // 2. Route based on Axis Alignment
    const isV1 = isVertical(source.direction);
    const isV2 = isVertical(target.direction);

    if (isV1 === isV2) {
        // Case A: Parallel Axis (Horiz-Horiz or Vert-Vert)
        if (isV1) {
            routeVerticalVertical(start, end, dir1, dir2, points);
        } else {
            routeHorizontalHorizontal(start, end, dir1, dir2, points);
        }
    } else {
        // Case B: Mixed Axis (Horiz-Vert or Vert-Horiz)
        if (isV1) {
            routeVerticalHorizontal(start, end, dir1, dir2, points);
        } else {
            routeHorizontalVertical(start, end, dir1, dir2, points);
        }
    }

    points.push(end);
    points.push(p2);

    return filterColinearPoints(points);
}

// --- STRATEGY: Horizontal -> Horizontal ---
function routeHorizontalHorizontal(start, end, dir1, dir2, points) {
    const isFacing = (dir1.x === 1 && end.x > start.x) || (dir1.x === -1 && end.x < start.x);
    const hasSpace = Math.abs(end.x - start.x) > CLEARANCE; 

    if (isFacing && hasSpace) {
        const midX = (start.x + end.x) / 2;
        points.push({ x: midX, y: start.y });
        points.push({ x: midX, y: end.y });
    } else {
        const midY = (start.y + end.y) / 2;
        let channelY = midY;
        if (Math.abs(start.y - end.y) < CLEARANCE) {
             channelY = Math.max(start.y, end.y) + CLEARANCE;
        }
        points.push({ x: start.x, y: channelY });
        points.push({ x: end.x, y: channelY });
    }
}

// --- STRATEGY: Vertical -> Vertical ---
function routeVerticalVertical(start, end, dir1, dir2, points) {
    const isFacing = (dir1.y === 1 && end.y > start.y) || (dir1.y === -1 && end.y < start.y);
    const hasSpace = Math.abs(end.y - start.y) > CLEARANCE;

    if (isFacing && hasSpace) {
        const midY = (start.y + end.y) / 2;
        points.push({ x: start.x, y: midY });
        points.push({ x: end.x, y: midY });
    } else {
        const midX = (start.x + end.x) / 2;
        let channelX = midX;
        if (Math.abs(start.x - end.x) < CLEARANCE) {
             channelX = Math.max(start.x, end.x) + CLEARANCE;
        }
        points.push({ x: channelX, y: start.y });
        points.push({ x: channelX, y: end.y });
    }
}

// --- STRATEGY: Horizontal -> Vertical ---
function routeHorizontalVertical(start, end, dir1, dir2, points) {
    const dx = end.x - start.x;
    const isHRunValid = (dir1.x === 1 && dx >= 0) || (dir1.x === -1 && dx <= 0);
    
    // Check collision zones
    const isEntryClear = (dir2.y === 1 && start.y >= end.y) || (dir2.y === -1 && start.y <= end.y);

    if (isHRunValid && isEntryClear) {
        points.push({ x: end.x, y: start.y });
    } else {
        points.push({ x: start.x, y: end.y });
    }
}

// --- STRATEGY: Vertical -> Horizontal ---
function routeVerticalHorizontal(start, end, dir1, dir2, points) {
    const dy = end.y - start.y;
    const isVRunValid = (dir1.y === 1 && dy >= 0) || (dir1.y === -1 && dy <= 0);
    
    // Check collision zones
    const isEntryClear = (dir2.x === 1 && start.x >= end.x) || (dir2.x === -1 && start.x <= end.x);

    if (isVRunValid && isEntryClear) {
        points.push({ x: start.x, y: end.y });
    } else {
        points.push({ x: end.x, y: start.y });
    }
}

function filterColinearPoints(points) {
    if (points.length < 3) return points;
    const res = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i-1];
        const curr = points[i];
        const next = points[i+1];
        const isXAligned = Math.abs(prev.x - curr.x) < 0.1 && Math.abs(curr.x - next.x) < 0.1;
        const isYAligned = Math.abs(prev.y - curr.y) < 0.1 && Math.abs(curr.y - next.y) < 0.1;
        if (isXAligned || isYAligned) continue; 
        res.push(curr);
    }
    res.push(points[points.length-1]);
    return res;
}

// --- GEOMETRY UTILS (Rounded Corners) ---

function roundedCorner(prev, curr, next, r) {
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const len1 = Math.abs(dx1 + dy1);
    const len2 = Math.abs(dx2 + dy2);
    const validR = Math.min(r, len1 / 2, len2 / 2);

    const p1 = {
        x: curr.x - Math.sign(dx1) * validR,
        y: curr.y - Math.sign(dy1) * validR
    };
    const p2 = {
        x: curr.x + Math.sign(dx2) * validR,
        y: curr.y + Math.sign(dy2) * validR
    };

    return { p1, p2, r: validR };
}

function orthogonalRoundedPath(points, radius = 16) {
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
        const { p1, p2 } = roundedCorner(points[i - 1], points[i], points[i + 1], radius);
        d += ` L ${p1.x},${p1.y} Q ${points[i].x},${points[i].y} ${p2.x},${p2.y}`;
    }
    d += ` L ${points[points.length - 1].x},${points[points.length - 1].y}`;
    return d;
}

// --- STANDARD PATHS ---

function bezierPath(a, b) {
    const dir1 = a.vector; 
    const dir2 = b.vector;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    // 2. Base Curvature Strength (Adaptive)
    // Standard rule: 50% of distance makes for a nice cubic Bezier
    let strength = dist * 0.5;

    // 3. Enforce CLEARANCE
    // Ensures the line comes straight out of the socket for at least CLEARANCE pixels
    if (strength < CLEARANCE) {
        strength = CLEARANCE;
    }

    // 4. Handle "Difficult" Geometry (Backtracking)
    // If the target is "behind" the source (dot product < 0), 
    // we boost the loop size to ensure it arcs AROUND the node/content.
    const dot1 = dx * dir1.x + dy * dir1.y;
    
    // Also check if the Source is "behind" the Target's entry vector
    // This helps in perpendicular cases (Right -> Top) where they are close
    const dot2 = dx * dir2.x + dy * dir2.y; // dot product with target direction

    if (dot1 < 0 || dot2 > 0) {
        // Boost strength to force a wider loop
        // We add the CLEARANCE to ensure the loop clears the immediate node body
        strength = Math.max(strength, dist * 0.7 + CLEARANCE);
        
        // Cap the max strength slightly to prevent massive loops on huge diagrams,
        // but ensure it's at least enough to clear the gap.
        // Heuristic: If they are 100px apart, loop is ~110px.
        const MAX_LOOP = 300; 
        strength = Math.min(strength, Math.max(MAX_LOOP, dist * 1.5));
    }

    const cp1 = {
        x: a.x + dir1.x * strength,
        y: a.y + dir1.y * strength
    };
    const cp2 = {
        x: b.x + dir2.x * strength,
        y: b.y + dir2.y * strength
    };

    return `M ${a.x},${a.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${b.x},${b.y}`;

}

function straightPath(a, b) {
    return `M ${a.x},${a.y} L ${b.x},${b.y}`;
}

// --- RESOLVER ---

function resolveEndpoints(connection, nodes) {
    let sourceHandler, targetHandler;
    let sourceNode, targetNode;

    // 1. Resolve Source
    for (const node of nodes) {
        if (!sourceHandler) {
            sourceHandler = node.handlers.find(h => h.id === connection.sourceHandlerId);
            if (sourceHandler) sourceNode = node;
        }
        if (sourceHandler && (connection.targetHandlerId ? targetHandler : true)) break;
    }

    if (!sourceHandler) return null;

    const p1 = {
        x: sourceNode.position.x + sourceHandler.offset.x,
        y: sourceNode.position.y + sourceHandler.offset.y
    };
    
    // Resolve Target Position (Handle Ghost vs Real)
    let p2 = null;

    // 2. Resolve Target (Real or Ghost)
    if (connection.targetHandlerId) {
        for (const node of nodes) {
            targetHandler = node.handlers.find(h => h.id === connection.targetHandlerId);
            if (targetHandler) {
                targetNode = node;
                break;
            }
        }
        p2 = {
            x: targetNode.position.x + targetHandler.offset.x,
            y: targetNode.position.y + targetHandler.offset.y
        };
    } else if (connection.targetX !== undefined) {
        p2 = { x: connection.targetX, y: connection.targetY };
    }

    if (!p1 || !p2) return null;

    // 2. Resolve Vectors based on Direction
    let dir1, dir2;

    // Source Vector
    if (sourceHandler.direction === 'omni') {
        dir1 = getOmniVector(p1, p2);
    } else {
        dir1 = getDirVec(sourceHandler.direction || 'right');
    }

    // Target Vector
    // Note: If target is 'omni', it points TOWARDS the source (incoming)
    // Bezier logic expects vectors to point OUTWARDS from the node for control points.
    // So for the target, we want the vector p2 -> p1
    if (connection.targetHandlerId) {
        if (targetHandler.direction === 'omni') {
             dir2 = getOmniVector(p2, p1);
        } else {
             dir2 = getDirVec(targetHandler.direction || 'left');
        }
    } else {
        // Ghost target: usually implies opposite of source
        dir2 = { x: -dir1.x, y: -dir1.y }; 
    }

    return { 
        source: { ...p1, direction: sourceHandler.direction, vector: dir1 }, 
        target: { ...p2, direction: targetHandler?.direction, vector: dir2 } 
    };
}

// --- PUBLIC EXPORTS ---

export function calculatePath(connection, nodes, registry) {
    const endpoints = resolveEndpoints(connection, nodes);
    if (!endpoints) return '';
    const { source, target } = endpoints;

    switch (connection.pathType) {
        case ConnectionPathType.SMOOTH_STEP:
            const points = buildOrthogonalPoints(source, target);
            return orthogonalRoundedPath(points, 16); 
        case ConnectionPathType.STRAIGHT:
            return straightPath(source, target);
        case ConnectionPathType.BEZIER:
        default:
            return bezierPath(source, target);
    }
}

export function calculatePositionAlongPath(link, t, nodes, registry) {
    const d = calculatePath(link, nodes, registry);
    _workPath.setAttribute('d', d);
    const len = _workPath.getTotalLength();
    return _workPath.getPointAtLength(len * Math.max(0, Math.min(1, t)));
}

export function findClosestTOnPath(link, targetPoint, nodes, registry, precision = 20) {
    const d = calculatePath(link, nodes, registry);
    _workPath.setAttribute('d', d);
    const totalLength = _workPath.getTotalLength();
    let bestDist = Infinity, bestT = 0.5;

    for (let i = 0; i <= precision; i++) {
        const t = i / precision;
        const p = _workPath.getPointAtLength(totalLength * t);
        const dist = (p.x - targetPoint.x)**2 + (p.y - targetPoint.y)**2;
        if (dist < bestDist) { 
            bestDist = dist; 
            bestT = t;
        }
    }
    return bestT;
}