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
        spacing: 32,
        dotRadius: 1.5,
        dotColor: '#e0e0e0',
        snapToGrid: true
    },
    
    // Node settings
    node: {
        width: 128,
        height: 128,
        smallBorderRadius: 16,
        borderRadius: 32,
        largeBorderRadius: 64,
        labelTopMargin: 32,
        noteTopMargin: 24,
        iconSize: 64
    },
    
    // Handler settings
    handler: {
        width: 16,
        height: 32,
        radius: 16,
        label: {
            margin: 10,           
            position: 'left'     
        },
        margin: 4
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