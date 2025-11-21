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
            // Use the explicit offsets on the handler instance
            const localX = handler.offset_x || 0;
            const localY = handler.offset_y || 0;
            
            return {
                x: node.x + localX,
                y: node.y + localY
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
    
    if (link.source && link.target) {
        sourcePos = findGlobalHandlerPos(link.source);
        targetPos = findGlobalHandlerPos(link.target);
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

/**
 * Calcola la posizione (x, y) lungo un path SVG
 * @param {string} pathString - Il path SVG 'd'
 * @param {number} offset - Posizione normalizzata (0.0 a 1.0)
 * @returns {Object} {x, y} coordinate
 */
export function calculatePositionAlongPath(pathString, offset) {
    // 1. Crea un elemento SVG temporaneo per il percorso
    const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tempPath.setAttribute("d", pathString);
    
    // 2. Ottieni la lunghezza totale del percorso
    const length = tempPath.getTotalLength();
    
    // 3. Calcola il punto lungo il percorso alla distanza richiesta
    const point = tempPath.getPointAtLength(length * offset);
    
    // 4. Cleanup (importante per le performance)
    // Non possiamo eliminare l'elemento perché non è attaccato al DOM in questo esempio,
    // ma `getPointAtLength` funziona ugualmente. Se si usa D3 in modo più tradizionale
    // (es. `d3.select(".link").node().getPointAtLength(...)`), non serve creare l'elemento.
    
    return { x: point.x, y: point.y };
}