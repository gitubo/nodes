import { NodeDefinition, NODE_ROLES } from '../../core/sdk.js';
import TargetVerticalHandlerDefinition from '../handles/TargetVerticalHandler.js';
import CircleHandlerDefinition from '../handles/CircleHandler.js'; 

export default class LLMGuardrailNodeDefinition extends NodeDefinition {

    static get type() { return 'guardrail'; }

    constructor(x, y) {
        super(x, y);
        this.width = 96;
        this.height = 96;
        this.handlers.push(new TargetVerticalHandlerDefinition(0, this.height/2));
        this.handlers.push(new CircleHandlerDefinition(this.width, this.height/2, 'pass'));
        this.handlers.push(new CircleHandlerDefinition(this.width/2, this.height, 'fail', 'bottom'));
    }

    static get role() { return "Guardrail"; }

    static getIconPath() { return 'm6.95 13.55 5.65-5.65-1.425-1.425-4.225 4.225-2.1-2.1-1.425 1.425 3.525 3.525Zm1.05 6.45q-3.475-.875-5.7375-3.9875T0 9.1v-6.1l8-3 8 3v6.1q0 3.8-2.2625 6.9125T8 20Zm0-2.1q2.6-.825 4.3-3.3t1.7-5.5v-4.725l-6-2.25-6 2.25v4.725q0 3.025 1.7 5.5t4.3 3.3Zm0-7.9Z'; }
    
    getShapeTemplate() { return `<path d="M8 0H88C92 0 96 4 96 8V88C96 92 93 96 88 96H8C4 96 0 92 0 88V8C0 4 4 0 8 0Z" />`;}

}