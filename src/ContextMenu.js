//import { store } from './state.js';
import { getIcon } from './Icons.js';

export function showHandlerContextMenu(event, data, eventBus, store) {
    event.preventDefault(); event.stopPropagation();
    showContextMenu(event, 'handler', data, eventBus, store);
}

export function showLinkContextMenu(event, data, eventBus, store) {
    event.preventDefault(); event.stopPropagation();
    showContextMenu(event, 'link', data, eventBus, store);
}

export function setupNodeContextMenu(selection) {
    selection.on("contextmenu", function(event, d) {
        event.preventDefault(); event.stopPropagation();
        showContextMenu(event, 'node', d);
    });
}

function showContextMenu(event, type, data, eventBus, store) {
    document.querySelectorAll('.context-menu-html').forEach(e => e.remove());
    
    const menu = document.createElement('div');
    menu.className = 'ui-panel context-menu-html';
    const x = event.pageX !== undefined ? event.pageX : event.x;
    const y = event.pageY !== undefined ? event.pageY : event.y;
    menu.style.left = `${x}px`; menu.style.top = `${y}px`;
    
    const actions = [];
    
    if (type === 'link') {
        if (data.label) {
            actions.push({
                icon: 'labelDelete', label: 'Remove Label',
                callback: () => { 
                    store.updateLink(data.id, { label: undefined }); 
                    store.deselect();
                }
            });
        } else {
            actions.push({
                icon: 'labelAdd', label: 'Add Label',
                callback: () => {
                    store.updateLink(data.id, { 
                        label: { text: 'Label', offset: 0.5, offsetX: 0, offsetY: 0 } 
                    });
                    store.deselect();
                }
            });
        }

        // REQUESTED: Edit action
        actions.push({
            icon: 'settings', label: 'Edit', 
            callback: () => {
                store.selectObject(type, data);
                if (eventBus) {
                    eventBus.emit('EDIT_PROPERTIES', { type, data }); // Was: EventBus.emit
                }
            }
        });

        // REQUESTED: Delete action
        actions.push({ icon: 'delete', label: 'Delete', variant: 'danger', callback: () => store.removeLink(data.id) });
    }
    else if (type === 'node') {
        actions.push({ icon: 'settings', label: 'Edit', callback: () => {
             store.selectObject(type, data);
             if (eventBus) {
                eventBus.emit('EDIT_PROPERTIES', { type, data }); // Was: EventBus.emit
             }
        }});
        actions.push({ icon: 'delete', label: 'Delete Node', variant: 'danger', callback: () => store.removeNode(data.id) });
    }
    else if (type === 'handler') {
        actions.push({
            icon: 'rename', label: 'Edit Text',
            callback: () => {
                 const val = prompt("Handler Label:", data.label);
                 if(val) { data.label = val; store.selectObject(null, null); }
             }
        });
    }

    actions.forEach(a => {
        const btn = document.createElement('button');
        btn.className = `icon-btn ${a.variant || ''}`;
        btn.innerHTML = getIcon(a.icon, 20) || getIcon('settings', 20);
        btn.title = a.label;
        btn.onclick = (e) => { 
            e.stopPropagation(); 
            try {
                if (eventBus && store && store.registry) {
                    let serializedData = null;
                    try {
                        if (type === 'node') {
                            const definition = store.registry.getNodeDefinition(data.type);
                            if (definition) serializedData = definition.serialize(data, store.registry); 
                        } else if (type === 'link') {
                            serializedData = { ...data }; // Links are simple objects, a shallow copy is fine
                        } else if (type === 'handler') {
                            const HandlerDef = store.registry.getHandlerDefinition(data.type);
                            if (HandlerDef) serializedData = HandlerDef.serialize(data); 
                        }
                    } catch (err) {
                        console.error("Failed to serialize object for CONTEXT_MENU_ACTION:", err);
                    }

                    eventBus.emit('CONTEXT_MENU_ACTION', { 
                        action: a.label, 
                        object_type: type, 
                        object_id: data.id, 
                        object_data: serializedData 
                    });
                }

                 a.callback();
            } finally {
                menu.remove();
            }
        };
        menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    setTimeout(() => {
        window.addEventListener('click', () => menu.remove(), { once: true });
        window.addEventListener('contextmenu', (e) => { if (!e.target.closest('.context-menu-html')) menu.remove(); }, { once: true });
    }, 10);
}

export function showNodeContextMenu(event, data, eventBus, store) {
    event.preventDefault(); event.stopPropagation();
    showContextMenu(event, 'node', data, eventBus, store);
}