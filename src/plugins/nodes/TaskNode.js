import { NodeDefinition, NODE_ROLES } from '../../core/sdk.js';
import SourceHandlerDefinition from '../handles/SourceHandler.js'; 
import TargetVerticalHandlerDefinition from '../handles/TargetVerticalHandler.js';

export default class TaskNodeDefinition extends NodeDefinition {

    static get type() { return 'task'; }
    
    constructor(x, y, _label, note, data) {
        super(x, y, 'task', note, data);
        this.width = 192;
        this.height = 96;
        this.handlers.push(new TargetVerticalHandlerDefinition(0, this.height/2));
        this.handlers.push(new SourceHandlerDefinition(this.width, this.height/2));
    }

    static getRole() { return NODE_ROLES.TOOLS; }

    static hasTargetHandlers() { return true; }

    static getIconPath() { return 'M16.64 10.74c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L.24 6.67c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM9.5 13.4c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'; }

    getShapePath() { return 'M32 0 176 0A16 16 90 01192 16L192 28A20 20 90 00192 68L192 80A16 16 90 01176 96L16 96A16 16 90 010 80L0 68 12 68 12 28 0 28 0 16A16 16 90 0116 0Z'; }
}