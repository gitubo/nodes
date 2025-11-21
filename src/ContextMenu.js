// ContextMenu.js - Refactored for HTML Overlay & Icons
import { removeNode, state } from './state.js';
import { render } from './render.js';
import { getIcon } from './Icons.js';
import { calculatePath, calculatePositionAlongPath } from './geometry.js';


export function showHandlerContextMenu(event, handlerData) {
    if (!event) return;
    event.preventDefault();
    event.stopPropagation();
    
    const eventForPosition = event.sourceEvent || event;
    showContextMenu(eventForPosition, 'handler', handlerData);
}

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
export function showContextMenu(event, type, data) {
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
                    // 1. Otteniamo le coordinate del mouse relative alla Viewport
                    // Nota: 'event' è l'evento nativo passato dalla UI, dobbiamo trasformarlo in coordinate SVG
                    const viewport = d3.select("g.viewport").node();
                    const [mouseX, mouseY] = d3.pointer(event, viewport);

                    // 2. Calcoliamo dove si trova il punto centrale (t=0.5) del link
                    const pathData = calculatePath(data);
                    const centerPoint = calculatePositionAlongPath(pathData, 0.5);

                    // 3. Impostiamo l'offset iniziale come delta tra click e centro
                    data.label = {
                        text: 'label',
                        offset: 0.5, // Ancora logica iniziale a metà curva
                        offsetX: mouseX - centerPoint.x,
                        offsetY: mouseY - centerPoint.y
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
    } else if (type === 'handler') {
        // === NUOVE AZIONI PER HANDLER ===
        const actions = [];
        
        // Logica: Se hideLabel è true (o non definito e label esiste), mostra "Show Label"
        // Se label è visibile, mostra "Hide Label"
        
        // Verifica se la label è attualmente visibile
        const isVisible = !data.hideLabel && data.label;

        if (!isVisible) {
            actions.push({
                id: 'add_handler_label',
                label: 'Add Label',
                icon: 'labelAdd', // Assicurati che questa icona esista in Icons.js
                callback: () => {
                    // Se la label era solo nascosta, la mostriamo
                    data.hideLabel = false;
                    // Se non aveva proprio un testo (caso raro), mettiamo un default
                    if (!data.label) data.label = "...";
                    
                    // Reset offset opzionale: se vuoi che riappaia nella posizione di default
                    // data.labelOffsetX = 0;
                    // data.labelOffsetY = 0;
                    
                    render();
                }
            });
        } else {
            actions.push({
                id: 'remove_handler_label',
                label: 'Remove Label',
                icon: 'labelDelete', // Assicurati che questa icona esista in Icons.js
                callback: () => {
                    // Nascondiamo la label impostando il flag
                    data.hideLabel = true;
                    render();
                }
            });
        }
        
        // Opzionale: Reset posizione label
        if (isVisible && (data.labelOffsetX || data.labelOffsetY)) {
             actions.push({
                id: 'reset_label_pos',
                label: 'Reset Position',
                icon: 'reset',
                callback: () => {
                    data.labelOffsetX = 0;
                    data.labelOffsetY = 0;
                    render();
                }
            });
        }

        return actions;
    }
    return [];
}