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
        this.handlers.push(new SourceHandlerDefinition(this.width, CONFIG.node.handlerSeparator * 2));
    }

    getIconPath() { return 'm187-551 106 45q18-36 38.5-71t43.5-67l-79-16-109 109Zm154 81 133 133q57-26 107-59t81-64q81-81 119-166t41-192q-107 3-192 41T464-658q-31 31-64 81t-59 107Zm229-96q-20-20-20-49.5t20-49.5q20-20 49.5-20t49.5 20q20 20 20 49.5T669-566q-20 20-49.5 20T570-566Zm-15 383 109-109-16-79q-32 23-67 43.5T510-289l45 106Zm326-694q9 136-34 248T705-418l-2 2-2 2 22 110q3 15-1.5 29T706-250L535-78l-85-198-170-170-198-85 172-171q11-11 25-15.5t29-1.5l110 22q1-1 2-1.5t2-1.5q99-99 211-142.5T881-877ZM149-325q35-35 85.5-35.5T320-326q35 35 34.5 85.5T319-155q-26 26-80.5 43T75-80q15-109 31.5-164t42.5-81Zm42 43q-14 15-25 47t-19 82q50-8 82-19t47-25q19-17 19.5-42.5T278-284q-19-18-44.5-17.5T191-282Z'; }

    getShapePath() {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const R = CONFIG.node.largeBorderRadius;           
        const sR = CONFIG.node.smallBorderRadius;
        const source =  H/2 - (SourceHandlerDefinition.getDimension(this.handlers[0]).radius+CONFIG.handler.margin);

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