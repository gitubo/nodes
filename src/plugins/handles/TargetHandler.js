import { HandlerDefinition, CONFIG } from '../../core/sdk.js';

export default class TargetHandlerDefinition extends HandlerDefinition {

    static get type() { return 'target'; }

    constructor(x, y, label, direction='left') {
        super(x, y, label, direction);
        this.role = "target";
        this.dimensions = {
            width: CONFIG.handler.width,
            height: CONFIG.handler.height
        };
    }

    render(selection) {
        const w = CONFIG.handler.width;
        const h = CONFIG.handler.height;

        selection.append("rect")
            .attr("width", w)
            .attr("height", h)
            .attr("x", -w/2)
            .attr("y", -h/2)
            .attr("class", "handler target");
        
    }
}