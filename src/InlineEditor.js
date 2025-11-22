import { store } from './state.js';
import { eventBus } from './EventBus.js';

/**
 * Spawns an input box over an SVG element to edit text inline.
 * @param {Event} event - The mouse event (dblclick or click)
 * @param {string} initialValue - Current text
 * @param {Function} onCommit - Callback(newValue) when editing finishes
 */
export function startInlineEditing(event, initialValue, onCommit) {
    const target = event.target; // The SVG text element
    const bbox = target.getBoundingClientRect();
    
    const input = document.createElement("input");
    input.type = "text";
    input.value = initialValue;
    input.className = "inline-editor-input";
    
    // Position exactly over the text
    input.style.left = `${bbox.left - 4}px`; // Slight padding
    input.style.top = `${bbox.top - 4}px`;
    input.style.width = `${Math.max(bbox.width + 20, 80)}px`; // Min width
    input.style.height = `${bbox.height + 8}px`;
    
    // Match font styles
    const computed = window.getComputedStyle(target);
    input.style.fontSize = computed.fontSize;
    input.style.fontFamily = computed.fontFamily;
    input.style.textAlign = computed.textAlign || "center";
    
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    let commited = false;

    const finish = () => {
        if (commited) return;
        commited = true;
        const val = input.value;
        input.remove();
        if (val !== initialValue) {
            onCommit(val);
            eventBus.emit('RENDER_REQUESTED'); // Force update
        }
    };
    
    input.addEventListener("blur", finish);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") finish();
        if (e.key === "Escape") {
            commited = true; // Cancel without callback
            input.remove();
        }
    });
}