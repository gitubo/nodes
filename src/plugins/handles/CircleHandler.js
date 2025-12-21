import { HandlerDefinition } from '../../core/sdk.js';

export default class CircleHandlerDefinition extends HandlerDefinition {

    static get type() { return 'circle'; }

    constructor(x, y) {
        super(x, y, '', 'omni', 'any');
        this.role = 'source';
        this.dimensions = { internal_radius: 52, external_radius: 64 };
    }

    getShapeTemplate() {
        const ir = this.dimensions.internal_radius;
        const er = this.dimensions.external_radius;
        return `<path d="M 0,-${er}A1 1 0 000 ${er} 1 1 0 000-${er}ZM0-${ir}A1 1 0 010 ${ir} 1 1 0 010-${ir}" />`;
    }

}