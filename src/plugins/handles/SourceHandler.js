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

    // --- Private Helper Logic ---
    _renderAddNodeHelper(group, eventBus) {
        const HELPER_CFG = { size: 24, linkLength: 48 }; // Compact size
        
        group.selectAll(".helper-group")
            .data([this]) // Bind data to ensure update consistency
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
                        .attr("fill", "transparent")
                        .attr("stroke", "var(--dim-gray)")
                        .attr("stroke-width", 2)
                        .attr("stroke-dasharray", "4,4");

                    // D. Plus Icon (+)
                    btn.append("path")
                        .attr("class", "helper-plus")
                        .attr("d", "M -6 0 L 6 0 M 0 -6 L 0 6")
                        .attr("stroke", "var(--dim-gray)")
                        .attr("stroke-width", 2);

                    // E. Events (Hover & Click)
                    this._attachHelperEvents(btn, eventBus, HELPER_CFG);

                    return g;
                },
                update => update, // No specific update logic needed usually
                exit => exit.remove()
            )
            .lower(); // Push behind the main handler circle
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
                  .style("fill", "transparent");
                  
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

    /*
    renderExtras(group, state) {
        const HELPER_CFG = { size: 36, linkLength: 48 };

        // Logic adapted from your existing code [cite: 564-586]
        if (!state.isConnected) {
            selection.selectAll(".helper-group").data([this])
                .join(
                    enter => {
                        const g = enter.append("g").attr("class", "helper-group");
                        
                        // Dashed Link
                        g.append("line").attr("class", "helper-link")
                            .attr("x1", 0).attr("y1", 0)
                            .attr("x2", HELPER_CFG.linkLength).attr("y2", 0)
                            .attr("stroke", "var(--dim-gray)")
                            .attr("stroke-width", 2)
                            .attr("stroke-dasharray", "5,5");

                        // Button Group
                        const btn = g.append("g").attr("class", "helper-button")
                             .attr("transform", `translate(${HELPER_CFG.linkLength}, 0)`);
                        
                        // Box
                        btn.append("rect").attr("class", "helper-box")
                            .attr("x", -HELPER_CFG.size/2).attr("y", -HELPER_CFG.size/2)
                            .attr("width", HELPER_CFG.size).attr("height", HELPER_CFG.size)
                            .attr("rx", 4)
                            .attr("fill", "transparent")
                            .attr("stroke", "var(--dim-gray)")
                            .attr("stroke-dasharray", "5,5")
                            .attr("stroke-width", 2);

                        // Plus Icon
                        btn.append("path").attr("class", "helper-plus")
                            .attr("d", "M -8 0 L 8 0 M 0 -8 L 0 8") // Slightly smaller path
                            .attr("stroke", "var(--dim-gray)")
                            .attr("stroke-width", 3);
                        
                        // Hover Effects (Simple CSS class toggle logic handled here via D3)
                        btn.on("mouseenter", function() {
                            d3.select(this).transition().duration(150)
                                .attr("transform", `translate(${HELPER_CFG.linkLength}, 0) scale(1.1)`);
                            d3.select(this).select(".helper-box").style("stroke", "var(--baltic-blue)").style("fill", "var(--lavender)");
                            d3.select(this).select(".helper-plus").style("stroke", "var(--baltic-blue)");
                        })
                        .on("mouseleave", function() {
                            d3.select(this).transition().duration(150)
                                .attr("transform", `translate(${HELPER_CFG.linkLength}, 0) scale(1)`);
                            d3.select(this).select(".helper-box").style("stroke", "var(--dim-gray)").style("fill", "transparent");
                            d3.select(this).select(".helper-plus").style("stroke", "var(--dim-gray)");
                        })
                        .on("click", (event, d) => {
                            event.stopPropagation();
                            event.preventDefault(); // Prevent zoom/pan issues
                            
                            if (state.eventBus) {
                                // Calculate screen position for the menu
                                const screenX = event.clientX;
                                const screenY = event.clientY;
                                
                                state.eventBus.emit('CMD_REQUESTED', {
                                    command: 'open_connection_menu',
                                    payload: { 
                                        clientX: screenX, 
                                        clientY: screenY, 
                                        sourceHandlerId: d.id 
                                    }
                                });
                            }
                        });

                        return g;
                    },
                    update => update,
                    exit => exit.remove()
                )
                .lower();
        } else {
            // Remove if connected
            selection.selectAll(".helper-group").remove();
        }

        // 3. Render Labels
        const labelData = (this.label && this.label !== '') ? [this] : [];
        selection.selectAll("g.handler-label-group")
            .data(labelData)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", "handler-label-group")
                        .style("cursor", "move");
                    g.append("text").attr("class", "handler-label-text");
                    return g;
                },
                update => {
                    update.each(function(d) {
                        const g = d3.select(this);
                        // Simplified positioning logic for brevity
                        const x = radius + 8 + (d.labelOffsetX || 0);
                        const y = (d.labelOffsetY || 0);
                        g.attr("transform", `translate(${x}, ${y})`);
                        g.select("text").text(d.label).attr("text-anchor", "start").attr("dy", "0.3em");
                    });
                    return update;
                },                
                exit => exit.remove()
            );
    }
            

    render(selection, state = {}) {
        const radius = CONFIG.handler.radius;
        const cx = 0;
        const cy = 0;
        
        const HELPER_CFG = { size: 36, linkLength: 48, plusSize: 24 };
        
        if (!state.isConnected) {
            selection.selectAll(".helper-group").data([this])
                .join(
                    enter => {
                        const g = enter.append("g").attr("class", "helper-group");
                        
                        // Dashed Link
                        g.append("line").attr("class", "helper-link")
                            .attr("x1", 0).attr("y1", 0)
                            .attr("x2", HELPER_CFG.linkLength).attr("y2", 0)
                            .attr("stroke", "var(--dim-gray)")
                            .attr("stroke-width", 2)
                            .attr("stroke-dasharray", "5,5");

                        // Button Group
                        const btn = g.append("g").attr("class", "helper-button")
                             .attr("transform", `translate(${HELPER_CFG.linkLength}, 0)`);
                        
                        // Box
                        btn.append("rect").attr("class", "helper-box")
                            .attr("x", -HELPER_CFG.size/2).attr("y", -HELPER_CFG.size/2)
                            .attr("width", HELPER_CFG.size).attr("height", HELPER_CFG.size)
                            .attr("rx", 4)
                            .attr("fill", "transparent")
                            .attr("stroke", "var(--dim-gray)")
                            .attr("stroke-dasharray", "5,5")
                            .attr("stroke-width", 2);

                        // Plus Icon
                        btn.append("path").attr("class", "helper-plus")
                            .attr("d", "M -8 0 L 8 0 M 0 -8 L 0 8") // Slightly smaller path
                            .attr("stroke", "var(--dim-gray)")
                            .attr("stroke-width", 3);
                        
                        // Hover Effects (Simple CSS class toggle logic handled here via D3)
                        btn.on("mouseenter", function() {
                            d3.select(this).transition().duration(150)
                                .attr("transform", `translate(${HELPER_CFG.linkLength}, 0) scale(1.1)`);
                            d3.select(this).select(".helper-box").style("stroke", "var(--baltic-blue)").style("fill", "var(--lavender)");
                            d3.select(this).select(".helper-plus").style("stroke", "var(--baltic-blue)");
                        })
                        .on("mouseleave", function() {
                            d3.select(this).transition().duration(150)
                                .attr("transform", `translate(${HELPER_CFG.linkLength}, 0) scale(1)`);
                            d3.select(this).select(".helper-box").style("stroke", "var(--dim-gray)").style("fill", "transparent");
                            d3.select(this).select(".helper-plus").style("stroke", "var(--dim-gray)");
                        })
                        .on("click", (event, d) => {
                            event.stopPropagation();
                            event.preventDefault(); // Prevent zoom/pan issues
                            
                            if (state.eventBus) {
                                // Calculate screen position for the menu
                                const screenX = event.clientX;
                                const screenY = event.clientY;
                                
                                state.eventBus.emit('CMD_REQUESTED', {
                                    command: 'open_connection_menu',
                                    payload: { 
                                        clientX: screenX, 
                                        clientY: screenY, 
                                        sourceHandlerId: d.id 
                                    }
                                });
                            }
                        });

                        return g;
                    },
                    update => update,
                    exit => exit.remove()
                )
                .lower();
        } else {
            // Remove if connected
            selection.selectAll(".helper-group").remove();
        }

        // 1. Draw the main handler circle
        selection.selectAll("circle.handler.source")
            .data([this])
            .join(
                enter => enter.append("circle")
                    .attr("class", "handler source")
                    .attr("cx", cx)
                    .attr("cy", cy)
                    .attr("r", radius)
                    .on("contextmenu", (event, d) => {
                        import('../components/ContextMenu.js').then(m => m.showHandlerContextMenu(event, d));
                    }),
                update => update.attr("r", radius)
            );


        // 3. Render Labels
        const labelData = (this.label && this.label !== '') ? [this] : [];
        selection.selectAll("g.handler-label-group")
            .data(labelData)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", "handler-label-group")
                        .style("cursor", "move");
                    g.append("text").attr("class", "handler-label-text");
                    return g;
                },
                update => {
                    update.each(function(d) {
                        const g = d3.select(this);
                        // Simplified positioning logic for brevity
                        const x = radius + 8 + (d.labelOffsetX || 0);
                        const y = (d.labelOffsetY || 0);
                        g.attr("transform", `translate(${x}, ${y})`);
                        g.select("text").text(d.label).attr("text-anchor", "start").attr("dy", "0.3em");
                    });
                    return update;
                },                
                exit => exit.remove()
            );
    }
            */
}