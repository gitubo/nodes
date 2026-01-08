import { NodeDefinition } from '../../core/sdk.js';
import CircleHandlerDefinition from '../handles/CircleHandler.js'; 

export default class LLMQueryNodeDefinition extends NodeDefinition {

    static get type() { return 'query'; }

    constructor(x, y) {
        super(x, y);
        this.width = 96;
        this.height = 96;
        this.handlers.push(new CircleHandlerDefinition(this.width, this.height/2));
    }

    static get role() { return "Trigger"; }

    static getIconPath() { return 'M0 20v-18q0-.825.5875-1.4125T2 0h16q.825 0 1.4125.5875T20 2v12q0 .825-.5875 1.4125T18 16H4L0 20Zm3.15-6h14.85v-12H2v13.125l1.15-1.125Zm-1.15 0v-12 12'; }
    
    getShapeTemplate() { return `<path d="M48 0A1 1 0 0048 96 1 1 0 0048 0Z" />`;}

}