import { NodeDefinition, NODE_ROLES } from '../../core/sdk.js';
import CircleHandlerDefinition from '../handles/CircleHandler.js'; 

export default class LLMStorageNodeDefinition extends NodeDefinition {

    static get type() { return 'storage'; }

    constructor(x, y) {
        super(x, y, 'redis');
        this.width = 128;
        this.height = 105;
        this.handlers.push(new CircleHandlerDefinition(this.width/2, 0, '', 'top'));
    }

    static get role() { return NODE_ROLES.TOOLS; }

    static getIconPath() { return ''; }
    
    getShapeTemplate() { return `<path d="M128 14C128-4 0-4 0 12 0 28 128 28 128 14M0 12V92C0 108 128 108 128 94V14" />`;}

}