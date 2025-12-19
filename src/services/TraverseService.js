// /src/services/TraverseService.js

export class TraverseService {
    async run(state, strategy) {
        const { nodes, links } = state;

        // Use the strategy's sorting logic (Requirement 2)
        const sortedNodes = strategy.sortNodes(nodes, links);
        
        // Initialize the aggregator (Requirement 1)
        const aggregator = strategy.getInitialAggregator();
        const visitors = strategy.getVisitors();

        for (const node of sortedNodes) {
            const visitor = visitors[node.type] || visitors['default'];
            if (visitor) {
                // Visitors should mutate the aggregator object
                visitor(node, aggregator, { nodes, links });
            }
        }

        // CRITICAL FIX: Return the aggregator so it's not empty in the event
        return aggregator;
    }
}