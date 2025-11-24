import { TargetHandlerDefinition } from './TargetHandler.js';

export class TargetHorizontalHandlerDefinition extends TargetHandlerDefinition {
    static DIMENSIONS = {
        width: TargetHandlerDefinition.DIMENSIONS.height,
        height: TargetHandlerDefinition.DIMENSIONS.width
    };

    constructor() {
        super();
        this.type = 'target_horizontal';
    }

}