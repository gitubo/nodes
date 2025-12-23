import { HandlerDefinition } from '../../core/sdk.js';

export default class BidirectionalHandlerDefinition extends HandlerDefinition {

    static get type() { return 'bidir'; }

    constructor(x, y, label, direction='bottom') {
        super(x, y, label, direction, 'bi');
        this.role = "";
        this.dimensions = { width: 36, height: 36 };
    }

    getShapeTemplate() {
        const w = this.dimensions.width/2;
        const h = this.dimensions.height/2;
        return `<path d="M-${w} 0 0-${h} ${w} 0 0 ${h}Z" />`;
    }

}