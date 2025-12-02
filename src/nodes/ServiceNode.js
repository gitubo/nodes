// nodes/TaskNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js'; 
import { TargetHorizontalHandlerDefinition } from '../handlers/TargetHorizontalHandler.js';

export class ServiceNodeDefinition extends NodeDefinition {
    constructor(x, y, _label, note, data) {
        super(x, y, 'service', note, data);
        this.type = 'service';
        this.width = 192;
        this.height = 96;
        this.handlers.push(new TargetHorizontalHandlerDefinition(48, 0));
    }
    static hasTargetHandlers() { return true; }

    static getIconPath() { return 'M400 800Q316 800 243 768.5T116 683Q62 629 31 555.5T0 398Q0 314 31 241.5T116 115Q170 61 243 30.5T400 0Q484 0 557 30.5T684 115Q738 169 769 241.5T800 398Q800 482 769 555.5T684 683Q630 737 557 768.5T400 800ZM400 742Q435 706 458.5 659.5T497 549H304Q318 609 341.5 657T400 742ZM315 730Q290 692 272 648T242 549H92Q130 620 180 660.5T315 730ZM486 729Q558 706 615.5 660T708 549H559Q546 603 528.5 647T486 729ZM72 489H231Q228 462 227.5 440.5T227 398Q227 373 228 353.5T232 310H72Q65 334 62.5 353T60 398Q60 424 62.5 444.5T72 489ZM293 489H508Q512 458 513 438.5T514 398Q514 378 513 359.5T508 310H293Q289 341 288 359.5T287 398Q287 419 288 438.5T293 489ZM568 489H728Q735 465 737.5 444.5T740 398Q740 372 737.5 353T728 310H569Q572 345 573 363.5T574 398Q574 420 572.5 439.5T568 489ZM558 250H708Q675 181 617.5 135T485 70Q510 107 527.5 150T558 250ZM304 250H498Q487 197 461 147.5T400 60Q368 87 346 131T304 250ZM92 250H243Q254 196 271 153.5T314 71Q239 90 183 135T92 250Z'; }

    getShapePath() {
        return 'M28 0 28 12 68 12 68 0 176 0A16 16 90 01192 16L192 68A32 32 90 01160 96L32 96A32 32 90 010 64L0 16A16 16 90 0116 0Z';
        const W = CONFIG.node.width;
        const H = W;
        const R = CONFIG.node.width / 2;
        const handlerDimensions = TargetHorizontalHandlerDefinition.getDimension(this.handlers[0]);
        const targetHandlerHeight =  handlerDimensions.width/2 + CONFIG.handler.margin;
        const targetHandlerLeft =  W/2 - handlerDimensions.height/2 - CONFIG.handler.margin;
        const targetHandlerRight =  W/2 + handlerDimensions.height/2 + CONFIG.handler.margin;
        
        return `
            M${targetHandlerLeft} 1.8 
            A${R} ${R} 0 000 ${R}
            A1 1 0 00${W} ${R} 
            A1 1 0 00${H} ${R}
            A${R} ${R} 0 00${targetHandlerRight} 1.8
            L${targetHandlerRight} ${targetHandlerHeight}
            L${targetHandlerLeft} ${targetHandlerHeight}
            Z
        `.replace(/\s+/g, ' ');
    }
}