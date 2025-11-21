import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';
import { TargetHandlerDefinition } from '../handlers/TargetHandler.js';

const DEFINITIONS = {
    sourceSeparator: 20,
    sourceHandlerLabels: ["yes", "no"]
}

function appendSourceHandler(d, label) {
    if(!d || !(d.sourceHandlers))
        return;
    const sourceHandlerBox = (SourceHandlerDefinition.getDimension().radius+2);
    const verticalOffset = (DEFINITIONS.sourceSeparator+sourceHandlerBox) + (DEFINITIONS.sourceSeparator+sourceHandlerBox*2)*(d.sourceHandlers.length);
    const element = {type: 'source', label: label, offset_x: d.width, offset_y: verticalOffset};
    d.sourceHandlers.push(element);
}

export class DecisionNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'decision';
        this.width = 120;
        this.height = 60;
        this.targetHandlers = [];
        this.targetHandlers.push(
            { type: 'target', label: 'input', offset_x: 0, offset_y: CONFIG.node.height / 2 },
        );
        this.sourceHandlers = [];
        DEFINITIONS.sourceHandlerLabels.forEach(sourceHandlerLabel => {appendSourceHandler(this, sourceHandlerLabel)});
    }
    
    getDimensions(d) {
        const sourceHandlers = (Array.isArray(d?.handlers) ? d.handlers : []).filter(h => h.type === 'source');
        const sourceHandlerBox = (SourceHandlerDefinition.getDimension().radius+2);
        console.log("sourceHandlerBox: "+sourceHandlerBox);
        console.log("DEFINITIONS.sourceSeparator: "+DEFINITIONS.sourceSeparator);
        const verticalOffset = (DEFINITIONS.sourceSeparator) + (DEFINITIONS.sourceSeparator+sourceHandlerBox*2)*(sourceHandlers.length);
        console.log("verticalOffset: "+verticalOffset);
        return {
            width: 120, 
            height: verticalOffset 
        };
    }

    getHandlers() {
        return [
            ...this.targetHandlers,
            ...this.sourceHandlers
        ];
    }
    
    /**
     * Initial data for decision nodes
     */
    getData() {
        return {
            name: 'Decision',
            condition: '',
            width: this.width,
            height: this.height
        };
    }
    
    /**
     * Diamond shape path
     */
    getShapePath() {
        const W = this.width;
        const H = this.height;
        const sR = CONFIG.node.smallBorderRadius;
        const sourceHandler = (SourceHandlerDefinition.getDimension().radius+2)*2;
        const targetHandlerWidth =  TargetHandlerDefinition.getDimension().width/2+2;
        const targetHandlerHeightUp =  H/2 - TargetHandlerDefinition.getDimension().height/2 - 2;
        const targetHandlerHeightDown =  H/2 + TargetHandlerDefinition.getDimension().height/2 + 2;

        let height = 0;
        const sourceSeparator = DEFINITIONS.sourceSeparator;

        // Upper side
        let path = "";
        path += "M ${sR},0 ";
        path += "L ${W - sR},0 ";
        path += "A ${sR},${sR} 0 0 1 ${W},${sR} ";
        path += "L ${W},"+sourceSeparator+" ";
        height += sourceSeparator;

        this.sourceHandlers.forEach((handler, index) => {
                height += sourceHandler;
                path += "A 1,1 0 0 0 ${W},"+height+" ";
                height += sourceSeparator;
                if(index === this.sourceHandlers.length-1 ) path += "L ${W},"+(height-sR)+" ";
                else path += "L ${W},"+height+" ";
            });
        if(this.sourceHandlers.length == 0){
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