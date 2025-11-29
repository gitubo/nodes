// src/AddNodeHelper.js
// NESSUN IMPORT di 'store', 'registry' o 'eventBus'

// Questa configurazione è locale e va bene
export const HELPER_CONFIG = {
    size: 36, linkLength: 48, plusSize: 24, plusStrokeWidth: 3, 
    hoverScale: 1.1, menuItemHeight: 36, menuWidth: 180
};

export class AddNodeHelperSystem {
    constructor(svg, store, registry, eventBus) {
        this.svg = svg;
        this.viewport = svg.select("g.viewport");
        this.store = store;
        this.registry = registry;
        this.eventBus = eventBus;
    }

    /**
     * Avvia gli event listener per questo sistema.
     */
    listen() {
        // Aggiorna gli helper quando la topologia cambia
        this.eventBus.on('NODE_CREATED', this.update.bind(this));
        this.eventBus.on('NODE_UPDATED', this.update.bind(this)); 
        this.eventBus.on('NODE_REMOVED', this.update.bind(this));
        this.eventBus.on('CONNECTION_CREATED', this.update.bind(this));
        this.eventBus.on('CONNECTION_REMOVED', this.update.bind(this));
        this.eventBus.on('NODE_MOVED', this.update.bind(this));
        this.eventBus.on('STATE_LOADED', this.update.bind(this)); 
    }

    /**
     * Chiamato dagli eventi per rieseguire il rendering degli helper.
     */
    update() {
        this.render(this.viewport);
    }

    /**
     * Esegue il rendering (join D3) degli helper sul viewport.
     */
    render(viewport) {
        const helpers = [];
        // USA: this.store e this.registry
        this.store.nodes.forEach(node => {
//            const nodeDef = this.registry.getNodeDefinition(node.type);
//            const handlers = nodeDef ? nodeDef.getHandlers(node) : [];
            const handlers = node.getHandlers() || [];
            
            handlers.forEach(handler => {
                const def = this.registry.getHandlerDefinition(handler.type);
                if (def && typeof def.getRole === 'function') {
                    handler.role = def.getRole(handler);
                }
                if (handler.role === 'source') {
                    const isConnected = this.store.links.some(link => String(link.sourceHandlerId) === String(handler.id));
                    if (!isConnected) {
                        const offsetX = handler.offset.x || 0;
                        const offsetY = handler.offset.y || 0;
                        helpers.push({
                            id: `helper_${handler.id}`,
                            handlerId: handler.id,
                            nodeId: node.id,
                            position: { x: node.position.x + offsetX, y: node.position.y + offsetY },
                            relX: offsetX, 
                            relY: offsetY
                        });
                    }
                }
            });
        });

        let helperLayer = viewport.select("g.helper-layer");
        if (helperLayer.empty()) helperLayer = viewport.append("g").attr("class", "helper-layer");

        helperLayer.selectAll("g.add-node-helper")
            .data(helpers, d => d.handlerId)
            .join(
                enter => {
                    const g = enter.append("g").attr("class", "add-node-helper")
                        .attr("data-node-id", d => d.nodeId)
                        .attr("transform", d => `translate(${d.position.x}, ${d.position.y})`);
                    
                    // Usa una arrow function per passare il contesto 'this'
                    g.each((d, i, nodes) => {
                        this.renderHelper(d3.select(nodes[i]));
                    });
                    return g;
                },
                update => update
                    .attr("data-node-id", d => d.nodeId)
                    .attr("transform", d => `translate(${d.position.x}, ${d.position.y})`),
                exit => exit.remove()
            );
    }

    /**
     * Logica di rendering per un singolo helper (il "+").
     * Chiamato da render().
     */
    renderHelper(group) {
        const cfg = HELPER_CONFIG;
        const data = group.datum();

        group.append("line").attr("class", "helper-link")
            .attr("x1", 0).attr("y1", 0).attr("x2", cfg.linkLength).attr("y2", 0);
        
        const btn = group.append("g").attr("class", "helper-button")
            .attr("transform", `translate(${cfg.linkLength}, 0)`);
        
        btn.append("rect").attr("class", "helper-box")
            .attr("x", -cfg.size/2).attr("y", -cfg.size/2)
            .attr("width", cfg.size).attr("height", cfg.size).attr("rx", 4);
        
        btn.append("path").attr("class", "helper-plus")
            .attr("d", "M -10 0 L 10 0 M 0 -10 L 0 10")
            .attr("stroke-width", cfg.plusStrokeWidth);
        
        btn.on("mouseenter", function() {
            d3.select(this).transition().duration(150)
                .attr("transform", `translate(${cfg.linkLength}, 0) scale(${cfg.hoverScale})`);
        })
        .on("mouseleave", function() {
            d3.select(this).transition().duration(150)
                .attr("transform", `translate(${cfg.linkLength}, 0) scale(1)`);
        })
        .on("click", (event) => {
            event.stopPropagation();
            const [mx, my] = d3.pointer(event, this.svg.node());

            // La funzione di filtro ora prende il 'type' come stringa, 
            // ma la sua logica interna deve essere basata sul 'this.registry'
            // per recuperare la definizione.
            // NOTA: il parametro 'filter' qui è il filtro che showNodeTypeMenu applicherà.
            // Il filtro passato DEVE essere una funzione che accetta l'oggetto definizione (def)
            // come fa il tuo esempio showNodeTypeMenu.
            
            // Quindi, il problema era come definire la funzione 'filter' qui.
            
            // La funzione 'filter' che viene passata a this.showNodeTypeMenu riceve
            // *già* l'oggetto 'def' (la NodeDefinition) grazie alla logica interna 
            // di showNodeTypeMenu (come mostrato nel tuo esempio):
            // if (!filterFn || filterFn(def)) { ...
            
            // Riscriviamo solo la funzione filter corretta (come Lambda)
            const filter = (def) => {
                // Chiamiamo il metodo d'istanza getHandlers() sulla definizione (def)
                // che è stata ottenuta internamente da showNodeTypeMenu:
                return def.hasTargetHandlers();
            };
            
            // Chiamata a this.showNodeTypeMenu con il filtro corretto
            this.showNodeTypeMenu({x: mx, y: my}, filter, (type) => {
                // Questo callback onSelect ora ha il 'this' corretto
                const newNode = this.store.addNode(type, data.position.x + 150, data.position.y);
                if (newNode) {
                    const targetHandler = newNode.handlers.find(h => h.role === 'target');
                    if (targetHandler) {
                        this.store.addLink(data.handlerId, targetHandler.id);
                    }
                }
            });
        });
    }

    /**
     * Mostra il menu popup per la selezione del tipo di nodo.
     */
    showNodeTypeMenu(position, filterFn, onSelect) {
        d3.selectAll(".node-type-menu").remove();
        const types = [];
        
        // USA: this.registry
        this.registry.getNodeTypes().forEach(type => {
            const def = this.registry.getNodeDefinition(type);
            if (!filterFn || filterFn(def)) {
                types.push({ type, label: type.charAt(0).toUpperCase() + type.slice(1) });
            }
        });
        if (types.length === 0) return;
        
        // USA: this.svg
        const menu = this.svg.append("g").attr("class", "node-type-menu")
            .attr("transform", `translate(${position.x + 10}, ${position.y})`);
        
        const h = types.length * HELPER_CONFIG.menuItemHeight;
        menu.append("rect").attr("class", "menu-background")
            .attr("width", HELPER_CONFIG.menuWidth).attr("height", h).attr("rx", 6);
        
        types.forEach((t, i) => {
            const g = menu.append("g").attr("class", "menu-item")
                .attr("transform", `translate(0, ${i * HELPER_CONFIG.menuItemHeight})`)
                .on("click", function(e) {
                    e.stopPropagation();
                    onSelect(t.type);
                    d3.selectAll(".node-type-menu").remove();
                });
            g.append("rect").attr("class", "menu-item-bg")
                .attr("width", HELPER_CONFIG.menuWidth).attr("height", HELPER_CONFIG.menuItemHeight);
            g.append("text").attr("class", "menu-item-text")
                .attr("x", 16).attr("y", HELPER_CONFIG.menuItemHeight/2)
                .attr("dominant-baseline", "middle").text(t.label);
            g.on("mouseenter", function() { d3.select(this).select("rect").classed("menu-item-hover", true); });
            g.on("mouseleave", function() { d3.select(this).select("rect").classed("menu-item-hover", false); });
        });

        // USA: this.svg
        this.svg.on("click.menu", () => d3.selectAll(".node-type-menu").remove(), { once: true });
    }
}