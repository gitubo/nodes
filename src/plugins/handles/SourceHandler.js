import { HandlerDefinition, CONFIG } from '../../core/sdk.js';

export default class SourceHandlerDefinition extends HandlerDefinition {

    static get type() { return 'source'; }

    constructor(x, y, label, direction='right') {
        super(x, y, label, direction);
        this.role = 'source';
        this.dimensions = { radius: CONFIG.handler.radius };
    }
    
    // 1. Standard Shape (The visual "port")
    getShapePath() {
        const r = CONFIG.handler.radius;
        return `M 0,0 m -${r},0 a ${r},${r} 0 1,0 ${r*2},0 a ${r},${r} 0 1,0 -${r*2},0`;
    }

    renderExtras(group, state) {
        // We only show the helper if NOT connected
        if (!state.isConnected) {
            this._renderAddNodeHelper(group, state.eventBus);
        } else {
            group.selectAll(".helper-group").remove();
        }
    }

    _renderAddNodeHelper(group, eventBus) {
        const HELPER_CFG = { size: 32, linkLength: 48 };
        
        group.selectAll(".helper-group")
            .data([this]) 
            .join(
                enter => {
                    const g = enter.append("g").attr("class", "helper-group");

                    // A. Dashed Link line
                    g.append("path")
                        .attr("class", "helper-link")
                        .attr("d", `M 0,0 L ${HELPER_CFG.linkLength},0`)
                        .attr("stroke", "var(--dim-gray)")
                        .attr("stroke-width", 2)
                        .attr("stroke-dasharray", "4,4")
                        .attr("fill", "none");

                    // B. Button Group container
                    const btn = g.append("g")
                        .attr("class", "helper-button")
                        .attr("transform", `translate(${HELPER_CFG.linkLength}, 0)`);

                    // C. Button Box (Rect)
                    btn.append("rect")
                        .attr("class", "helper-box")
                        .attr("x", -HELPER_CFG.size / 2)
                        .attr("y", -HELPER_CFG.size / 2)
                        .attr("width", HELPER_CFG.size)
                        .attr("height", HELPER_CFG.size)
                        .attr("rx", 4)
                        .attr("fill", "var(--platinum)")
                        .attr("stroke", "var(--dim-gray)")
                        .attr("stroke-width", 2)
                        .attr("stroke-dasharray", "4,4");

                    // D. Plus Icon (+)
                    btn.append("path")
                        .attr("class", "helper-plus")
                        .attr("d", `M -${HELPER_CFG.size/4} 0 L ${HELPER_CFG.size/4} 0 M 0 -${HELPER_CFG.size/4} L 0 ${HELPER_CFG.size/4}`)
                        .attr("stroke", "var(--dim-gray)")
                        .attr("stroke-width", 2);

                    // E. Events (Hover & Click)
                    this._attachHelperEvents(btn, eventBus, HELPER_CFG);

                    return g;
                },
                update => update,
                exit => exit.remove()
            )
            .lower(); 
    }

    _attachHelperEvents(selection, eventBus, config) {
        selection
            .on("mouseenter", function() {
                const el = d3.select(this);
                el.transition().duration(150)
                  .attr("transform", `translate(${config.linkLength}, 0) scale(1.1)`);
                
                el.select(".helper-box")
                  .style("stroke", "var(--baltic-blue)")
                  .style("fill", "var(--lavender)");
                  
                el.select(".helper-plus")
                  .style("stroke", "var(--baltic-blue)");
            })
            .on("mouseleave", function() {
                const el = d3.select(this);
                el.transition().duration(150)
                  .attr("transform", `translate(${config.linkLength}, 0) scale(1)`);
                
                el.select(".helper-box")
                  .style("stroke", "var(--dim-gray)")
                  .style("fill", "var(--platinum)");
                  
                el.select(".helper-plus")
                  .style("stroke", "var(--dim-gray)");
            })
            .on("click", (event, d) => {
                event.stopPropagation();
                event.preventDefault();
                
                if (eventBus) {
                    eventBus.emit('CMD_REQUESTED', {
                        command: 'open_connection_menu',
                        payload: { 
                            clientX: event.clientX, 
                            clientY: event.clientY, 
                            sourceHandlerId: d.id 
                        }
                    });
                }
            });
    }
}