import { HandlerDefinition, CONFIG } from '../../core/sdk.js';

export default class TargetHandlerDefinition extends HandlerDefinition {

    static get type() { return 'target'; }

    constructor(x, y, label, direction='left') {
        super(x, y, label, direction, 'in');
        this.role = "target";
        this.dimensions = { width: CONFIG.handler.width, height: CONFIG.handler.height };
    }

    getShapeTemplate() {
        const w = CONFIG.handler.width/2;
        const h = CONFIG.handler.height/2;
        return `<path d="M-${w} -${h}H${w}V${h}H-${w}Z" />`;
    }

}