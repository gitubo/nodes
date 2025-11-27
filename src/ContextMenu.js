import { store } from './state.js';
import { getIcon } from './Icons.js';
import { eventBus } from './EventBus.js';

export function showHandlerContextMenu(event, data) {
    event.preventDefault(); event.stopPropagation();
    showContextMenu(event, 'handler', data);
}

export function showLinkContextMenu(event, data) {
    event.preventDefault(); event.stopPropagation();
    showContextMenu(event, 'link', data);
}

export function setupNodeContextMenu(selection) {
    selection.on("contextmenu", function(event, d) {
        event.preventDefault(); event.stopPropagation();
        showContextMenu(event, 'node', d);
    });
}

function showContextMenu(event, type, data) {
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
                eventBus.emit('EDIT_PROPERTIES', { type, data });
            }
        });

        // REQUESTED: Delete action
        actions.push({ icon: 'delete', label: 'Delete', variant: 'danger', callback: () => store.removeLink(data.id) });
    }
    else if (type === 'node') {
        actions.push({ icon: 'settings', label: 'Edit', callback: () => {
             store.selectObject(type, data);
             eventBus.emit('EDIT_PROPERTIES', { type, data });
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