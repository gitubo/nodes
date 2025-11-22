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

            // Check "Hide" flag
            if (!d.label || d.hideLabel) return; 
            
            const labelG = group.append("g")
                .attr("class", "handler-label-group")
                .style("cursor", "move"); // Indicate draggable

            // Positioning Logic
            const baseX = cx + radius + 8;
            const baseY = cy;
            const x = baseX + (d.labelOffsetX || 0);
            const y = baseY + (d.labelOffsetY || 0);
            
            labelG.attr("transform", `translate(${x}, ${y})`);

            // Text
            const text = labelG.append("text")
                .attr("class", "handler-label-text")
                .attr("dy", "0.3em")
                .text(d.label);
                
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