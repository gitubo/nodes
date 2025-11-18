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
        width: 120,
        height: 60,
        borderRadius: 10
    },
    
    // Handler settings
    handler: {
        source: {
            width: 64,
            height: 20,
            connectorRadius: 5,
            connectorOffset: 5,
            bottomOffset: 25
        },
        target: {
            width: 16,
            height: 16
        },
        basic: {
            radius: 8
        }
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