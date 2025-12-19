import { NodeDefinition, NODE_ROLES, CONFIG } from '../../core/sdk.js';
import CircleHandlerDefinition from '../handles/CircleHandler.js'; 

export default class CircleNodeDefinition extends NodeDefinition {

    static get type() { return 'circle'; }

    constructor(x, y) {
        super(x, y, '');
        this.width = 96;
        this.height = 96;
        this.handlers.push(new CircleHandlerDefinition(this.width/2, this.height/2));
    }

    static getIconPath() { return ''; }
    
    getShapePath() {
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;

        return 'M48 0A1 1 0 0048 96 1 1 0 0048 0Z';
    }

    getShapeAttributes() {
        // Example: If the user configured a specific data value, override the CSS
        if (this.data && this.data.isUrgent) {
             return { stroke: 'orange', 'stroke-width': 5 }; // This overrides .node-body.circle
        }
        return null; // Fallback to CSS
    }

}