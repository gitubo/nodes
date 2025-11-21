// nodes/StartNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';


export class StartNodeDefinition extends NodeDefinition {
    constructor() {
        super();
        this.type = 'start';
        this.width = 60;
        this.height = 60;
        this.handlers = [{ type: 'source', label: 'output', offset_x: this.width, offset_y: this.height / 2 }];
    }
    
    getData() {
        return {
            label: 'start',
            width: this.width,
            height: this.height
        };
    }
    
    getShapePath() {
        const W = this.width;
        const H = this.height;
        const R = CONFIG.node.largeBorderRadius;           
        const sR = CONFIG.node.smallBorderRadius;    
        const source =  H/2 - (SourceHandlerDefinition.getDimension().radius+2);

        return `
            M ${R},0
            L ${W - sR},0
            A ${sR},${sR} 0 0 1 ${W},${sR}
            L ${W},${source}
            A 1,1 0 0 0 ${W},${H - source}
            L ${W},${H - sR}
            A ${sR},${sR} 0 0 1 ${W - sR},${H}
            L ${R},${H}
            A ${R},${R} 0 0 1 0,${H - R}
            L 0,${R}
            A ${R},${R} 0 0 1 ${R},0
            Z
        `.replace(/\s+/g, ' ');
    }

}