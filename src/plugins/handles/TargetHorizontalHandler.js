import { CONFIG } from '../../core/sdk.js';
import TargetHandlerDefinition from '../handles/TargetHandler.js';

export default class TargetHorizontalHandlerDefinition extends TargetHandlerDefinition {

    static get type() { return 'target_horizontal'; }

    constructor(x, y, label) {
        super(x, y, label, 'top');
        const _w = this.dimensions.height;
        const _h = this.dimensions.width;
        this.dimensions = { width: _h, height: _w };
    }

    getShapeTemplate() {
        const h = this.dimensions.width/2;
        const w = this.dimensions.height/2;
        return `<path d="M-${w} -${h}H${w}V${h}H-${w}Z" />`;
    }


}