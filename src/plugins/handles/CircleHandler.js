import { HandlerDefinition } from '../../core/sdk.js';

export default class CircleHandlerDefinition extends HandlerDefinition {

    static get type() { return 'circle'; }

    constructor(x, y, label, direction='right') {
        super(x, y, label, direction, 'out');
        this.role = 'source';
        this.dimensions = { radius: 16 };
    }

    getShapeTemplate() {
        const r = this.dimensions.radius;
        return `<path d="M-${r} 0A1 1 0 00${r} 0 1 1 0 00-${r} 0" />`;
    }

}