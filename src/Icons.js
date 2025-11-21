// Icons.js - Libreria centralizzata SVG
export const ICONS = {
    delete: '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
    plus: '<path d="M10 5 L10 15 M5 10 L15 10"/>',
    minus: '<path d="M5 10 L15 10"/>',
    zoomIn: '<circle cx="11" cy="11" r="8"></circle> <line x1="21" y1="21" x2="16.65" y2="16.65"></line> <line x1="11" y1="8" x2="11" y2="14"></line> <line x1="8" y1="11" x2="14" y2="11"></line>',
    zoomOut: '<circle cx="11" cy="11" r="8"></circle> <line x1="21" y1="21" x2="16.65" y2="16.65"></line> <line x1="8" y1="11" x2="14" y2="11"></line>',
    zoomFitToScreen: '<circle cx="11" cy="11" r="8"></circle> <line x1="21" y1="21" x2="16.65" y2="16.65"></line> <rect x="8" y="8" width="6" height="6"></rect>',
    zoomResetView: '<circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"></circle> <path d="M7 3h-2a2 2 0 0 0-2 2v2"></path> <path d="M17 3h2a2 2 0 0 1 2 2v2"></path> <path d="M17 21h2a2 2 0 0 0 2-2v-2"></path> <path d="M7 21h-2a2 2 0 0 1-2-2v-2"></path>',
    reset: '<circle cx="10" cy="10" r="4" fill="none"/>',
    close: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
    settings: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',
    labelAdd: '<line x1="3" y1="12" x2="3" y2="7" stroke-width="2"></line> <line x1="3" y1="7" x2="16" y2="7" stroke-width="2"></line> <line x1="16" y1="7" x2="21" y2="13" stroke-width="2"></line> <line x1="21" y1="13" x2="16" y2="19" stroke-width="2"></line> <line x1="16" y1="19" x2="11" y2="19" stroke-width="2"></line> <line x1="5" y1="15" x2="5" y2="21" stroke-width="2"></line> <line x1="2" y1="18" x2="8" y2="18" stroke-width="2"></line>',
    labelDelete: '<line x1="3" y1="19" x2="3" y2="9" stroke-width="2"></line> <line x1="8" y1="7" x2="16" y2="7" stroke-width="2"></line> <line x1="16" y1="7" x2="21" y2="13" stroke-width="2"></line> <line x1="21" y1="13" x2="17" y2="17" stroke-width="2"></line> <line x1="13" y1="19" x2="3" y2="19" stroke-width="2"></line> <line x1="18" y1="21" x2="3" y2="5" stroke-width="2"></line>',
    addNode: '<circle cx="12" cy="12" r="10"></circle> <line x1="12" y1="7" x2="12" y2="17"></line> <line x1="7" y1="12" x2="17" y2="12"></line>',
    openFile: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path> <polyline points="14 2 14 8 20 8"></polyline> <line x1="12" y1="18" x2="12" y2="10"></line> <polyline points="9 13 12 10 15 13"></polyline>',
    saveFile: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path> <polyline points="14 2 14 8 20 8"></polyline> <line x1="12" y1="10" x2="12" y2="17"></line> <polyline points="9 15 12 18 15 15"></polyline>'
};



/**
 * Restituisce l'SVG completo formattato
 */
export function getIcon(name, size = 24, className = '') {
    const path = ICONS[name] || '';
    return `
        <svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0">
            ${path}
        </svg>
    `;
}

/**
 * Versione stroke-only (per icone tipo zoom che usano linee)
 */
export function getStrokeIcon(name, size = 24, strokeWidth = 2) {
    const path = ICONS[name] || '';
    return `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}">
            ${path}
        </svg>
    `;
}