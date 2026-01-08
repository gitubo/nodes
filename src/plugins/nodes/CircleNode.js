import { NodeDefinition, NODE_ROLES, CONFIG } from '../../core/sdk.js';
import RingHandlerDefinition from '../handles/RingHandler.js'; 

export default class CircleNodeDefinition extends NodeDefinition {

    static get type() { return 'circle'; }

    constructor(x, y) {
        super(x, y, '');
        this.width = 96;
        this.height = 96;
        this.handlers.push(new RingHandlerDefinition(this.width/2, this.height/2));
    }

    static getIconPath() { return ''; }
    
    getShapeTemplate() { return `<path d="M48 0A1 1 0 0048 96 1 1 0 0048 0Z" />`;}

    getShapeAttributes() {
        if (this.data && this.data.isUrgent) {
             return { stroke: 'orange', 'stroke-width': 5 };
        }
        return null;
    }

}