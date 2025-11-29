import { HandlerDefinition } from './HandlerDefinition.js';
import { CONFIG } from '../config.js';
//import { linkInteractionManager } from '../LinkInteractionManager.js';
//import { eventBus } from '../EventBus.js';
//import { startInlineEditing } from '../InlineEditor.js';

export class SourceHandlerDefinition extends HandlerDefinition {
    constructor(x, y, label, direction='right') {
        super(x, y, label, direction);
        this.role = 'source';
        this.type = 'source';
        this.dimensions = { radius: CONFIG.handler.radius };
    }
    
    render(selection) {
        const radius = CONFIG.handler.radius;
        const cx = 0;
        const cy = 0;

        selection.selectAll("circle.handler.source")
            .data([this])
            .join(
                enter => enter.append("circle")
                    .attr("class", "handler source")
                    .attr("cx", cx)
                    .attr("cy", cy)
                    .attr("r", radius)
                    .on("contextmenu", (event, d) => {
                        import('../ContextMenu.js').then(m => m.showHandlerContextMenu(event, d));
                    }),
                update => update
                    .attr("r", radius)
            );

        const labelData = (this.label && this.label !== '') ? [this] : [];

        selection.selectAll("g.handler-label-group")
            .data(labelData)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", "handler-label-group")
                        .style("cursor", "move");

                    g.append("text")
                        .attr("class", "handler-label-text");

                    /*
                    g.call(d3.drag()
                        .on("start", (e) => e.sourceEvent.stopPropagation())
                        .on("drag", (e, d) => {
                            d.labelOffsetX = (d.labelOffsetX || 0) + e.dx;
                            d.labelOffsetY = (d.labelOffsetY || 0) + e.dy;                            
                            eventBus.emit('RENDER_REQUESTED'); 
                        })
                    );

                    g.on("dblclick", (e, d) => {
                        e.stopPropagation();
                        startInlineEditing(e, d.label, (val) => {
                            d.label = val;
                            eventBus.emit('RENDER_REQUESTED');
                        });
                    });
                    */

                    return g;
                },
                update => {
                    update.each(function(d) {
                        const g = d3.select(this);
                        
                        // --- LOGICA DI POSIZIONAMENTO ---
                        const position = d.labelPosition || 'left'; 
                        const margin = d.labelMargin !== undefined ? d.labelMargin : CONFIG.handler.label.margin;
                        const r = radius;
                        
                        let labelAnchorX = 0; 
                        let labelAnchorY = 0; 
                        let textAnchor = 'middle'; 
                        let dominantBaseline = 'middle';

                        const diagFactor = 0.707; // sin(45)
                        const r_m = r + margin;
                        const r_m_diag = (r + margin) * diagFactor;

                        switch(position) {
                            case 'top':
                                labelAnchorY = -r_m;
                                dominantBaseline = 'auto'; 
                                break;
                            case 'top-right':
                                labelAnchorX = r_m_diag;
                                labelAnchorY = -r_m_diag;
                                textAnchor = 'start';
                                dominantBaseline = 'auto'; 
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
                                dominantBaseline = 'auto'; 
                                break;
                            default:
                                labelAnchorX = r + 8;
                                break;
                        }

                        const x = labelAnchorX + (d.labelOffsetX || 0);
                        const y = labelAnchorY + (d.labelOffsetY || 0);
                        g.attr("transform", `translate(${x}, ${y})`);
                        
                        const text = g.select("text")
                            .text(d.label)
                            .attr("text-anchor", textAnchor);

                        if (dominantBaseline === 'auto') {
                            text.attr("dy", "-0.5em");
                        } else {
                            text.attr("dominant-baseline", dominantBaseline);
                        }
                    });
                    return update;
                },                
                exit => exit.remove()
            );
    }

}