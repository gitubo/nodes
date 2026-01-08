import { HandlerDefinition } from '../../core/sdk.js';

export default class RingHandlerDefinition extends HandlerDefinition {

    static get type() { return 'ring'; }

    constructor(x, y) {
        super(x, y, '', 'omni', 'any');
        this.role = 'source';
        this.dimensions = { inner_radius: 52, outer_radius: 64 };
    }

    getShapeTemplate() {
        const ir = this.dimensions.inner_radius;
        const or = this.dimensions.outer_radius;
        return `<path d="M 0,-${or}A1 1 0 000 ${or} 1 1 0 000-${or}ZM0-${ir}A1 1 0 010 ${ir} 1 1 0 010-${ir}" />`;
    }

}