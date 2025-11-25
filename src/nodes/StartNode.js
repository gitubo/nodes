// nodes/StartNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js';
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';

export class StartNodeDefinition extends NodeDefinition {
    constructor(x, y) {
        super(x, y, 'start');
        this.type = 'start';
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
        this.handlers.push(new SourceHandlerDefinition(this.width, this.height / 2));
    }

    static getShapePath(d) {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const R = CONFIG.node.largeBorderRadius;           
        const sR = CONFIG.node.smallBorderRadius;
        const source =  H/2 - (SourceHandlerDefinition.getDimension(d.handlers[0]).radius+2);

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