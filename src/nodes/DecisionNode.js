// nodes/DecisionNode.js - Example of a custom node definition
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';
import { TargetHandlerDefinition } from '../handlers/TargetHandler.js';

const DIMENSIONS = {
    width: 120,
    sourceSeparator: 20
}

export class DecisionNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'decision';
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
    }

    static getDimensions() {
        return  {
            width: this.width,
            height: this.height
        };
    }
    
    /**
     * Define initial handlers: 1 input, 2 outputs (yes/no)
     */
    getHandlers() {

        const sourceHandlers = ['yes', 'no'];

        let handlers = [];
        handlers.push(
            { type: 'target', label: 'input', offset_x: 0, offset_y: CONFIG.node.height / 2 },
            { type: 'source', label: 'yes', offset_x: CONFIG.node.width, offset_y: CONFIG.node.height / 3 },
            { type: 'source', label: 'no', offset_x: CONFIG.node.width, offset_y: CONFIG.node.height / 3 * 2 }
        );
        sourceHandlers.forEach(handler => {
            
        })

        return handlers;
    }
    
    /**
     * Initial data for decision nodes
     */
    getData() {
        return {
            name: 'Decision',
            condition: ''
        };
    }
    
    /**
     * Diamond shape path
     */
    getShapePath() {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const sR = CONFIG.node.smallBorderRadius;
        const sourceHandler = (SourceHandlerDefinition.getDimension().radius+2)*2;
        const targetHandlerWidth =  TargetHandlerDefinition.getDimension().width/2+2;
        const targetHandlerHeightUp =  H/2 - TargetHandlerDefinition.getDimension().height/2 - 2;
        const targetHandlerHeightDown =  H/2 + TargetHandlerDefinition.getDimension().height/2 + 2;

        let height = 0;
        const sourceSeparator = DIMENSIONS.sourceSeparator;
/*
        return `
            M ${sR},0
            L ${W - sR},0
            A ${sR},${sR} 0 0 1 ${W},${sR}
            L ${W},${H - sR}
            A ${sR},${sR} 0 0 1 ${W - sR},${H}
            L ${sR},${H}
            A ${sR},${sR} 0 0 1 0,${H - sR}
            L 0,${sR}
            A ${sR},${sR} 0 0 1 ${sR},0
            Z
        `.replace(/\s+/g, ' ');
*/

        // Upper side
        let path = "";
        path += "M ${sR},0 ";
        path += "L ${W - sR},0 ";
        path += "A ${sR},${sR} 0 0 1 ${W},${sR} ";
        path += "L ${W},"+sourceSeparator+" ";
        height += sourceSeparator;

        const handlers = this.getHandlers().filter(h => h.type === 'source')
        handlers.forEach((handler, index) => {
                console.log(handler.label);
                height += sourceHandler;
                path += "A 1,1 0 0 0 ${W},"+height+" ";
                height += sourceSeparator;
                if(index === handlers.length-1 ) path += "L ${W},"+(height-sR)+" ";
                else path += "L ${W},"+height+" ";
            });
        if(handlers.length == 0){
            height += sourceSeparator;
            path += "L ${W},"+height+" ";
        }
        
        this.height = height;

        // Bottom side
        path += "A ${sR},${sR} 0 0 1 ${W - sR},${H} ";
        path += "L ${sR},${H} ";
        path += "A ${sR},${sR} 0 0 1 0,${H - sR} ";
        path += "L 0,${targetHandlerHeightDown} ";
        path += "L ${targetHandlerWidth},${targetHandlerHeightDown} ";
        path += "L ${targetHandlerWidth},${targetHandlerHeightUp} ";
        path += "L 0,${targetHandlerHeightUp} ";
        path += "L 0,${sR} ";
        path += "A ${sR},${sR} 0 0 1 ${sR},0 ";
        path += "Z";

        const vars = {
            "${sR}": sR,
            "${W}": W,
            "${H}": height,
            "${W - sR}": W-sR,
            "${H - sR}": height-sR,
            "${H - sourceHandler}": height-sourceHandler,
            "${sourceHandler}": sourceHandler,
            "${targetHandlerWidth}": targetHandlerWidth,
            "${targetHandlerHeightUp}": targetHandlerHeightUp,
            "${targetHandlerHeightDown}": targetHandlerHeightDown,
        };

        for (const key in vars) {
            const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
            path = path.replace(regex, vars[key]);
        }
        console.log("path: ",path);
        return path.replace(/\s+/g, ' ');
    }
    
    /**
     * Custom serialization - include condition
     */
    serialize(node) {
        const base = super.serialize(node);
        return {
            ...base,
            condition: node.condition || ''
        };
    }
    
    /**
     * Custom deserialization - restore condition
     */
    deserialize(data) {
        const base = super.deserialize(data);
        return {
            ...base,
            condition: data.condition || ''
        };
    }
}