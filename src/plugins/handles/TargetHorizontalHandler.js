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

    render(selection) {
        const h = CONFIG.handler.width;
        const w = CONFIG.handler.height;

        selection.append("rect")
            .attr("width", w)
            .attr("height", h)
            .attr("x", -w/2)
            .attr("y", -h/2)
            .attr("class", "handler target");
        
        this.setupDrag(selection);
    }

}