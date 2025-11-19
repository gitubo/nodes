// config.js - Centralized configuration
export const CONFIG = {
    // Canvas settings
    canvas: {
        width: 1000,
        height: 800,
        backgroundColor: '#f8fbff'
    },
    
    // Grid settings
    grid: {
        enabled: true,
        spacing: 30,
        dotRadius: 1.5,
        dotColor: '#e0e0e0',
        snapToGrid: true
    },
    
    // Node settings
    node: {
        width: 60,
        height: 60,
        smallBorderRadius: 5,
        borderRadius: 10,
        largeBorderRadius: 20
    },
    
    // Handler settings
    handler: {
        width: 8,
        height: 16,
        radius: 8
    },
    
    // Link settings
    link: {
        controlOffset: 100,
        strokeWidth: 2,
        ghostDashArray: '5,5'
    },
    
    // Zoom settings
    zoom: {
        min: 0.2,
        max: 4
    }
};

// Utility to snap coordinates to grid
export function snapToGrid(value, gridSpacing = CONFIG.grid.spacing) {
    if (!CONFIG.grid.snapToGrid) return value;
    return Math.round(value / gridSpacing) * gridSpacing;
}