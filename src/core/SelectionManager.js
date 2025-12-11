// 
export class SelectionManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.selected = null; // { type: 'node'|'link', id: string }
    }

    select(type, object) {
        if(!object || !object.id) return;
        this.selected = { type, id: object.id };
        this.eventBus.emit('SELECTION_CHANGED', this.selected);
    }

    deselect() {
        if (this.selected) {
            this.selected = null;
            this.eventBus.emit('SELECTION_CHANGED', null);
        }
    }

    getSelected() {
        return this.selected;
    }
}