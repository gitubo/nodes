const MODULE = 8;
const MODULE_0_5 = MODULE / 2; //4
const MODULE_1_5 = MODULE * 1.5; //12
const MODULE_2 = MODULE * 2;  //16
const MODULE_3 = MODULE * 3;  //24
const MODULE_4 = MODULE * 4;  //32
const MODULE_8 = MODULE * 8;  //64
const MODULE_16 = MODULE * 16;  //128

export const CONFIG = {
    // Canvas settings
    canvas: {
        width: 1024,
        height: 1024,
        backgroundColor: '#f8fbff',
        scale: 2
    },
    
    // Grid settings
    grid: {
        enabled: true,
        spacing: MODULE_4,
        dotRadius: 1.5,
        dotColor: '#e0e0e0',
        snapToGrid: true
    },
    
    // Node settings
    node: {
        width: MODULE_16,
        height: MODULE_16,
        smallBorderRadius: MODULE_2,
        borderRadius: MODULE_4,
        largeBorderRadius: MODULE_8,
        labelTopMargin: MODULE_4,
        iconSize: MODULE_8,
        iconMargin: MODULE_2,
        iconPadding: MODULE_1_5,
        handlerSeparator: MODULE_4
    },
    
    // Handler settings
    handler: {
        width: MODULE_2,
        height: MODULE_4,
        radius: MODULE_2,
        label: {
            margin: MODULE,           
            position: 'left'     
        },
        margin: MODULE_0_5
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