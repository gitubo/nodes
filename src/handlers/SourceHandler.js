import { HandlerDefinition } from './HandlerDefinition.js';
import { CONFIG } from '../config.js';
import { linkInteractionManager } from '../LinkInteractionManager.js';
import { eventBus } from '../EventBus.js';
import { startInlineEditing } from '../InlineEditor.js';

const DIMENSIONS = { radius: CONFIG.handler.radius };

export class SourceHandlerDefinition extends HandlerDefinition {
    constructor() {
        super();
        this.type = 'source';
    }

    static getDimension() { return DIMENSIONS; }
    
    render(selection) {
        const radius = DIMENSIONS.radius;
        const cx = 0;
        const cy = 0;

        // Handler Circle
        selection.append("circle")
            .attr("class", "handler source")
            .attr("cx", cx).attr("cy", cy).attr("r", radius)
            .on("contextmenu", (event, d) => {
                import('../ContextMenu.js').then(m => m.showHandlerContextMenu(event, d));
            });

        // Render Label
        selection.each(function(d) {
            const group = d3.select(this);
            group.selectAll(".handler-label-group").remove(); 
            if (!d.label || d.label === '') return;

            const labelG = group.append("g")
                .attr("class", "handler-label-group")
                .style("cursor", "move"); // Indicate draggable

            // --- NEW POSITIONING LOGIC ---
            
            // Use the labelPosition set on the handler data (e.g., from SwitchNodeDefinition ) 
            // or default to 'right' if not specified.
            const position = d.labelPosition || 'left'; 
            const margin = d.labelMargin !== undefined ? d.labelMargin : CONFIG.handler.label.margin;
            const r = radius;
            
            let labelAnchorX = 0; // x-coordinate relative to handler center (cx=0)
            let labelAnchorY = 0; // y-coordinate relative to handler center (cy=0)
            let textAnchor = 'middle'; // SVG text-anchor property
            let dominantBaseline = 'middle'; // SVG dominant-baseline property

            // Constants for calculation
            const diagFactor = 0.707; // sin(45) or cos(45)
            const r_m = r + margin; // Radius + Margin
            const r_m_diag = (r + margin) * diagFactor; // Diagonal offset

            switch(position) {
                case 'top':
                    labelAnchorY = -r_m;
                    dominantBaseline = 'auto'; // Use dy for top alignment
                    break;
                case 'top-right':
                    labelAnchorX = r_m_diag;
                    labelAnchorY = -r_m_diag;
                    textAnchor = 'start';
                    dominantBaseline = 'auto'; // Use dy for top alignment
                    break;
                case 'right':
                    labelAnchorX = r_m;
                    textAnchor = 'start';
                    break;
                case 'bottom-right':
                    labelAnchorX = r_m_diag;
                    labelAnchorY = r_m_diag;
                    textAnchor = 'start';
                    dominantBaseline = 'hanging';
                    break;
                case 'bottom':
                    labelAnchorY = r_m;
                    dominantBaseline = 'hanging';
                    break;
                case 'bottom-left':
                    labelAnchorX = -r_m_diag;
                    labelAnchorY = r_m_diag;
                    textAnchor = 'end';
                    dominantBaseline = 'hanging';
                    break;
                case 'left':
                    labelAnchorX = -r_m;
                    textAnchor = 'end';
                    break;
                case 'top-left':
                    labelAnchorX = -r_m_diag;
                    labelAnchorY = -r_m_diag;
                    textAnchor = 'end';
                    dominantBaseline = 'auto'; // Use dy for top alignment
                    break;
                default:
                    // Fallback for custom or old hardcoded logic
                    labelAnchorX = r + 8; // Original hardcoded offset [cite: 1371]
                    break;
            }

            // d.labelOffsetX and d.labelOffsetY are for drag overrides (they are relative to the anchor) [cite: 1427]
            const x = labelAnchorX + (d.labelOffsetX || 0); 
            const y = labelAnchorY + (d.labelOffsetY || 0);

            labelG.attr("transform", `translate(${x}, ${y})`);
            
            // The actual text element uses the alignments
            const text = labelG.append("text")
                .attr("class", "handler-label-text")
                .attr("text-anchor", textAnchor)
                .text(d.label);

            // Apply dominant-baseline property for vertical alignment
            if (dominantBaseline === 'auto') {
                // SVG workaround for 'top' aligned text
                text.attr("dy", "-0.5em"); 
            } else {
                text.attr("dominant-baseline", dominantBaseline);
            }
                
            // Drag Behavior for Label
            labelG.call(d3.drag()
                .on("start", (e) => e.sourceEvent.stopPropagation())
                .on("drag", (e) => {
                    d.labelOffsetX = (d.labelOffsetX || 0) + e.dx;
                    d.labelOffsetY = (d.labelOffsetY || 0) + e.dy;
                    // Visual update
                    const newX = baseX + d.labelOffsetX;
                    const newY = baseY + d.labelOffsetY;
                    labelG.attr("transform", `translate(${newX}, ${newY})`);
                })
            );
            
            // Inline Editing on Double Click
            labelG.on("dblclick", (e) => {
                e.stopPropagation();
                startInlineEditing(e, d.label, (val) => {
                    d.label = val;
                    eventBus.emit('RENDER_REQUESTED');
                });
            });
        });

        this.setupDrag(selection);
    }
    
    setupDrag(selection) {
        selection.call(d3.drag()
            .on("start", (event, d) => {
                event.sourceEvent.stopPropagation();
                linkInteractionManager.startDrag(d.id, event.sourceEvent, false);
            })
            .on("drag", (event) => {
                linkInteractionManager.updateDrag(event.sourceEvent);
            })
            .on("end", (event, d) => {
                linkInteractionManager.endDrag(event, d.id, false);
            })
        );
    }
}