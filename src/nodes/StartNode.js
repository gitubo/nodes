// nodes/StartNode.js
import { NodeDefinition, NODE_ROLES } from './NodeDefinition.js';
import { CONFIG } from '../config.js';
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';

export class StartNodeDefinition extends NodeDefinition {
    constructor(x, y) {
        super(x, y, 'start');
        this.type = 'start';
        this.width = 192;
        this.height = 96;
        this.handlers.push(new SourceHandlerDefinition(this.width, this.height/2));
    }

    static getIconPath() { return 'M112 336 218 381Q236 345 256.5 310T300 243L221 227 112 336ZM266 417 399 550Q456 524 506 491T587 427Q668 346 706 261T747 69Q640 72 555 110T389 229Q358 260 325 310T266 417ZM495 321Q475 301 475 271.5T495 222 544.5 202 594 222 614 271.5 594 321 544.5 341 495 321ZM480 704 589 595 573 516Q541 539 506 559.5T435 598L480 704ZM806 10Q815 146 772 258T630 469L628 471 626 473 648 583Q651 598 646.5 612T631 637L460 809 375 611 205 441 7 356 179 185Q190 174 204 169.5T233 168L343 190Q344 189 345 188.5T347 187Q446 88 558 44.5T806 10ZM74 562Q109 527 159.5 526.5T245 561 279.5 646.5 244 732Q218 758 163.5 775T0 807Q15 698 31.5 643T74 562ZM116 605Q102 620 91 652T72 734Q122 726 154 715T201 690Q220 673 220.5 647.5T203 603Q184 585 158.5 585.5T116 605Z'; }
    
    getShapePath() {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const R = CONFIG.node.largeBorderRadius;           
        const sR = CONFIG.node.smallBorderRadius;
        const source =  H/2 - (SourceHandlerDefinition.getDimension(this.handlers[0]).radius+CONFIG.handler.margin);

        return 'M32 0 176 0A16 16 90 01192 16L192 28A20 20 90 00192 68L192 80A16 16 90 01176 96L32 96A32 32 90 010 64L0 32A32 32 90 0132 0Z';
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