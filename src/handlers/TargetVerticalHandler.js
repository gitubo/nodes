import { TargetHandlerDefinition } from './TargetHandler.js';

export class TargetVerticalHandlerDefinition extends TargetHandlerDefinition {
    constructor(x, y, label) {
        super(x, y, label);
        this.type = "target_vertical";
    }
}
