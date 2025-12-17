export class TraverseService {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * @param {Object} storeState - The full state { nodes, links, notes }
     * @param {Object} strategy - Definition of visitors { visitors: { 'type': fn }, onStart, onEnd }
     * @param {*} [initialAggregator={}] - Initial accumulation object
     */
    run(storeState, strategy, initialAggregator = {}) {
        const { nodes, links } = storeState;
        
        let aggregator = initialAggregator;

        // 1. Lifecycle: Start
        if (strategy.onStart) {
            const res = strategy.onStart(aggregator, storeState);
            if (res !== undefined) aggregator = res;
        }

        // 2. Topology: Sort Nodes
        // Default to current array order if no sort provided
        let sortedNodes = nodes;
        if (strategy.sortNodes) {
            sortedNodes = strategy.sortNodes(nodes, links);
        }

        // 3. Visit Nodes
        sortedNodes.forEach(node => {
            const visitFn = strategy.visitors?.[node.type] || strategy.visitors?.['default'];
            
            if (visitFn) {
                // Context with pre-calculated connections for convenience
                const context = {
                    id: node.id,
                    store: storeState,
                    inputs: links.filter(l => this._isTarget(l, node)),
                    outputs: links.filter(l => this._isSource(l, node))
                };
                
                // Visitor MUST modify aggregator or return a new one
                const res = visitFn(node, aggregator, context);
                if (res !== undefined) aggregator = res;
            }
        });

        // 4. Visit Connections (Optional separate pass)
        if (strategy.visitors?.['connection']) {
            links.forEach(link => {
                const context = { id: link.id, store: storeState };
                const res = strategy.visitors['connection'](link, aggregator, context);
                if (res !== undefined) aggregator = res;
            });
        }

        // 5. Lifecycle: End
        if (strategy.onEnd) {
            const res = strategy.onEnd(aggregator, storeState);
            if (res !== undefined) aggregator = res;
        }

        return aggregator;
    }

    // --- Helpers ---
    _isSource(link, node) {
        return node.handlers.some(h => h.id === link.sourceHandlerId);
    }

    _isTarget(link, node) {
        return node.handlers.some(h => h.id === link.targetHandlerId);
    }
}