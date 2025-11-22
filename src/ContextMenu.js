import { store } from './state.js';
import { getIcon } from './Icons.js';
import { calculatePath, calculatePositionAlongPath } from './geometry.js';
import { startInlineEditing } from './InlineEditor.js'; // NEW

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
                icon: 'rename', label: 'Edit Text',
                callback: () => {
                     // Find the label element to attach editor
                     const labelEl = document.querySelector(`.link-group.${data.id} + .link-label-group text`) || 
                                     document.querySelector(`[data-link-id="${data.id}"] text`) ||
                                     document.body; // Fallback
                     
                     // Trigger inline edit via fake event if element not easily found, 
                     // or just use prompt as fallback if DOM lookup fails
                     const promptVal = prompt("Edit Label:", data.label.text);
                     if(promptVal) { data.label.text = promptVal; store.selectObject(null, null); }
                }
            });
            actions.push({
                icon: 'labelDelete', label: 'Remove Label',
                callback: () => { delete data.label; store.selectObject(null, null); }
            });
        } else {
            actions.push({
                icon: 'labelAdd', label: 'Add Label',
                callback: () => {
                    data.label = { text: 'Label', offset: 0.5, offsetX: 0, offsetY: 0 };
                    store.selectObject(null, null);
                }
            });
        }
        actions.push({ icon: 'settings', label: 'Attributes', callback: () => store.selectObject(type, data) });
        actions.push({ icon: 'delete', label: 'Delete Link', variant: 'danger', callback: () => store.removeLink(data.id) });
    }
    else if (type === 'handler') {
        actions.push({
            icon: 'rename', label: 'Edit Text',
            callback: () => {
                 const val = prompt("Handler Label:", data.label);
                 if(val) { data.label = val; store.selectObject(null, null); }
            }
        });
        if (!data.hideLabel) {
            actions.push({
                icon: 'labelDelete', label: 'Hide Label',
                callback: () => { data.hideLabel = true; store.selectObject(null, null); }
            });
            actions.push({
                icon: 'reset', label: 'Reset Pos',
                callback: () => { data.labelOffsetX = 0; data.labelOffsetY = 0; store.selectObject(null, null); }
            });
        } else {
             actions.push({
                icon: 'labelAdd', label: 'Show Label',
                callback: () => { data.hideLabel = false; store.selectObject(null, null); }
            });
        }
    }
    else if (type === 'node') {
        actions.push({ icon: 'settings', label: 'Edit Properties', callback: () => store.selectObject(type, data) });
        actions.push({ icon: 'delete', label: 'Delete Node', variant: 'danger', callback: () => store.removeNode(data.id) });
    }

    actions.forEach(a => {
        const btn = document.createElement('button');
        btn.className = `icon-btn ${a.variant || ''}`;
        btn.innerHTML = getIcon(a.icon, 20) || getIcon('settings', 20);
        btn.title = a.label;
        btn.onclick = (e) => { e.stopPropagation(); a.callback(); menu.remove(); };
        menu.appendChild(btn);
    });
    
    document.body.appendChild(menu);
    setTimeout(() => {
        window.addEventListener('click', () => menu.remove(), { once: true });
        window.addEventListener('contextmenu', (e) => { if (!e.target.closest('.context-menu-html')) menu.remove(); }, { once: true });
    }, 10);
}