// ContextMenu.js - Refactored for HTML Overlay & Icons
import { removeNode } from './state.js';
import { state } from './state.js';
import { render } from './render.js';
import { getIcon } from './Icons.js';

/**
 * Setup context menu per nodi
 */
export function setupNodeContextMenu(selection) {
    selection.on("contextmenu", function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        showContextMenu(event, 'node', d);
    });
}

/**
 * Setup context menu per link
 */
export function showLinkContextMenu(event, linkData) { // 'event' è l'evento D3
    
    // FIX: Controlliamo subito se l'evento è arrivato
    if (!event) return;

    // Linea 22: L'evento qui è il D3 event object.
    event.preventDefault(); 
    event.stopPropagation();
    
    // Usiamo l'evento nativo (event.sourceEvent) per posizionare l'overlay HTML.
    // Se sourceEvent non esiste, usiamo l'evento D3 come fallback (meno preciso per HTML).
    const eventForPosition = event.sourceEvent || event;

    showContextMenu(eventForPosition, 'link', linkData);
}

/**
 * Genera e mostra il menu HTML
 */
function showContextMenu(event, type, data) {
    // Rimuovi vecchi menu
    removeContextMenu();

    // Crea container HTML (come i pannelli UI)
    const menu = document.createElement('div');
    menu.className = 'ui-panel context-menu-html';
    
    // Definisci le azioni in base al tipo
    const actions = getActions(type, data);
    
    // Genera bottoni icona
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `icon-btn ${action.variant || ''}`;
        btn.innerHTML = getIcon(action.icon, 20);
        btn.title = action.label; // Tooltip nativo
        
        btn.onclick = (e) => {
            e.stopPropagation();
            action.callback();
            removeContextMenu();
        };
        
        menu.appendChild(btn);
    });

    // Posizionamento assoluto basato sul mouse
    // event.pageX/Y funzionano bene per elementi fixed/absolute sul body
    const x = event.pageX;
    const y = event.pageY;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    document.body.appendChild(menu);

    // Chiudi cliccando fuori (usando setTimeout per evitare chiusura immediata)
    setTimeout(() => {
        window.addEventListener('click', removeContextMenu, { once: true });
        // Chiudi anche se si fa right click da un'altra parte
        window.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.context-menu-html') !== menu) {
                removeContextMenu();
            }
        }, { once: true });
    }, 10);
}

function removeContextMenu() {
    const existing = document.querySelector('.context-menu-html');
    if (existing) {
        existing.remove();
    }
    window.removeEventListener('click', removeContextMenu);
}

function getActions(type, data) {
    if (type === 'node') {
        return [
            {
                id: 'delete',
                label: 'Delete Node',
                icon: 'delete',
                variant: 'danger', 
                callback: () => {
                    removeNode(data.id);
                    render();
                }
            }
        ];
    } else if (type === 'link') {
        const actions = [];
        
        // Azione 1: Aggiungi Label (solo se non esiste già)
        if (!data.label) {
            actions.push({
                id: 'add_label',
                label: 'Add Label',
                icon: 'labelAdd',
                callback: () => {
                    data.label = {
                        text: 'label',
                        offset: 0.5, 
                        offsetX: 0, 
                        offsetY: -15
                    };
                    render();
                }
            });
        } else {
            actions.push({
                id: 'delete_label',
                label: 'Delete Label',
                icon: 'labelDelete',
                callback: () => {
                    delete data.label;
                    render();
                }
            }); 
        }
        
        // Azione 2: Cancella Link
        actions.push({
            id: 'delete',
            label: 'Delete Link',
            icon: 'delete',
            variant: 'danger',
            callback: () => {
                state.links = state.links.filter(l => l.id !== data.id);
                render();
            }
        });
        
        return actions;
    }
    return [];
}