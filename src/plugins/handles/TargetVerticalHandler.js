import TargetHandlerDefinition from '../handles/TargetHandler.js';

export default class TargetVerticalHandlerDefinition extends TargetHandlerDefinition {

    static get type() { return 'target_vertical'; }

    constructor(x, y, label) {
        super(x, y, label);
        this.type = "target_vertical";
    }
}
