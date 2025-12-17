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

// --- CORE ALGORITHM: Orthogonal Routing ---
function buildOrthogonalPoints(source, target) {
    const dir1 = getDirVec(source.direction);
    const dir2 = getDirVec(target.direction);

    // 1. Calculate "Escape Points" using CLEARANCE
    // This guarantees the line exits/enters straight for at least CLEARANCE pixels
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

// --- STRATEGY: Horizontal -> Horizontal (e.g. Left to Right) ---
function routeHorizontalHorizontal(start, end, dir1, dir2, points) {
    const isFacing = (dir1.x === 1 && end.x > start.x) || (dir1.x === -1 && end.x < start.x);
    // Ensure we have enough X space to fit two corners without overlapping
    const hasSpace = Math.abs(end.x - start.x) > CLEARANCE; 

    if (isFacing && hasSpace) {
        // Z-Shape: Midpoint in X
        const midX = (start.x + end.x) / 2;
        points.push({ x: midX, y: start.y });
        points.push({ x: midX, y: end.y });
    } else {
        // U-Shape: Go around
        const midY = (start.y + end.y) / 2;
        
        // Safety: Avoid cutting through nodes if Y is too close
        let channelY = midY;
        if (Math.abs(start.y - end.y) < CLEARANCE) {
             channelY = Math.max(start.y, end.y) + CLEARANCE;
        }

        points.push({ x: start.x, y: channelY });
        points.push({ x: end.x, y: channelY });
    }
}

// --- STRATEGY: Vertical -> Vertical (e.g. Top to Bottom) ---
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

// --- STRATEGY: Horizontal -> Vertical (e.g. Right to Top) ---
function routeHorizontalVertical(start, end, dir1, dir2, points) {
    // 1. Check if a simple Horizontal Run is valid direction-wise
    const dx = end.x - start.x;
    const isHRunValid = (dir1.x === 1 && dx >= 0) || (dir1.x === -1 && dx <= 0);

    // 2. CRITICAL FIX: Check for "Forbidden Zones"
    // If approaching a Top handler from below, or Bottom from above,
    // we cannot use the target's X-axis directly (collision).
    // Top (-1): Start must be above or equal to End (Start.y <= End.y)
    // Bottom (1): Start must be below or equal to End (Start.y >= End.y)
    const isEntryClear = (dir2.y === 1 && start.y >= end.y) || (dir2.y === -1 && start.y <= end.y);

    if (isHRunValid && isEntryClear) {
        // Strategy A: Horizontal First (1 Corner)
        // Path: Start -> (End.x, Start.y) -> End
        points.push({ x: end.x, y: start.y });
    } else {
        // Strategy B: Vertical First (2 Corners)
        // "Detour" around the corner.
        // Path: Start -> (Start.x, End.y) -> End
        // This creates a vertical segment at Start X, then goes Horizontal to Target.
        // Solves the "Right to Top" issue when Target is above/right.
        points.push({ x: start.x, y: end.y });
    }
}

// --- STRATEGY: Vertical -> Horizontal (e.g. Bottom to Left) ---
function routeVerticalHorizontal(start, end, dir1, dir2, points) {
    const dy = end.y - start.y;
    const isVRunValid = (dir1.y === 1 && dy >= 0) || (dir1.y === -1 && dy <= 0);
    
    // Check Forbidden Zones for Horizontal Target
    // Left (-1): Start must be Left (Start.x <= End.x)
    // Right (1): Start must be Right (Start.x >= End.x)
    const isEntryClear = (dir2.x === 1 && start.x >= end.x) || (dir2.x === -1 && start.x <= end.x);

    if (isVRunValid && isEntryClear) {
        // Strategy A: Vertical First (1 Corner)
        points.push({ x: start.x, y: end.y });
    } else {
        // Strategy B: Horizontal First (2 Corners)
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
        // Check alignment with epsilon for float precision
        const isXAligned = Math.abs(prev.x - curr.x) < 0.1 && Math.abs(curr.x - next.x) < 0.1;
        const isYAligned = Math.abs(prev.y - curr.y) < 0.1 && Math.abs(curr.y - next.y) < 0.1;
        
        if (isXAligned || isYAligned) {
            continue; 
        }
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
    // Limit radius to half the segment length to prevent artifacts
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
    const strength = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 0.5;
    const v1 = getDirVec(a.direction);
    const v2 = getDirVec(b.direction);
    v1.x *= strength; v1.y *= strength;
    v2.x *= strength; v2.y *= strength;

    return `M ${a.x},${a.y} C ${a.x + v1.x},${a.y + v1.y} ${b.x + v2.x},${b.y + v2.y} ${b.x},${b.y}`;
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

    const source = {
        x: sourceNode.position.x + sourceHandler.offset.x,
        y: sourceNode.position.y + sourceHandler.offset.y,
        direction: sourceHandler.direction || 'right'
    };

    let target = null;

    // 2. Resolve Target (Real or Ghost)
    if (connection.targetHandlerId) {
        for (const node of nodes) {
            targetHandler = node.handlers.find(h => h.id === connection.targetHandlerId);
            if (targetHandler) {
                targetNode = node;
                break;
            }
        }
        if (targetHandler) {
            target = {
                x: targetNode.position.x + targetHandler.offset.x,
                y: targetNode.position.y + targetHandler.offset.y,
                direction: targetHandler.direction || 'left'
            };
        }
    } else if (connection.targetX !== undefined) {
        // GHOST LINK
        let ghostDir = 'left';
        // Heuristic: Opposite to source for natural curves
        if (source.direction === 'left') ghostDir = 'right';
        if (source.direction === 'top') ghostDir = 'bottom';
        if (source.direction === 'bottom') ghostDir = 'top';

        target = {
            x: connection.targetX,
            y: connection.targetY,
            direction: ghostDir 
        };
    }

    if (!target) return null;
    return { source, target };
}

// --- PUBLIC EXPORTS ---

export function calculatePath(connection, nodes, registry) {
    const endpoints = resolveEndpoints(connection, nodes);
    if (!endpoints) return '';
    const { source, target } = endpoints;

    switch (connection.pathType) {
        case ConnectionPathType.SMOOTH_STEP:
            const points = buildOrthogonalPoints(source, target);
            return orthogonalRoundedPath(points, 16); // 16px radius for corners
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