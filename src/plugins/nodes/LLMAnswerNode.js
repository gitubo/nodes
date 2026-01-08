import { NodeDefinition, NODE_ROLES } from '../../core/sdk.js';
import TargetVerticalHandlerDefinition from '../handles/TargetVerticalHandler.js';

export default class LLMAnswerNodeDefinition extends NodeDefinition {

    static get type() { return 'answer'; }

    constructor(x, y) {
        super(x, y);
        this.width = 96;
        this.height = 96;
        this.handlers.push(new TargetVerticalHandlerDefinition(0, this.height/2));
    }

    static get role() { return "Tool"; }

    static getIconPath() { return 'M2.2224 20.0016q-.9167 0-1.5696-.6528T0 17.7792v-4.4448h2.2224v4.4448h15.5568v-15.5568H2.2224v4.4448h-2.2224v-4.4448q0-.9167.6528-1.5696T2.2224 0h15.5568q.9167 0 1.5696.6528T20.0016 2.2224v15.5568q0 .9167-.6528 1.5696T17.7792 20.0016H2.2224Zm6.1116-4.4448-1.5557-1.6112 2.8336-2.8336H0v-2.2224h9.6119L6.7783 6.056l1.5557-1.6112 5.556 5.556-5.556 5.556Z'; }
    
    getShapeTemplate() { return `<path d="M48 0A1 1 0 0048 96 1 1 0 0048 0Z" />`;}

}