export class TraverseService {
    async run(state, strategy) {
        const { nodes, links } = state;

        const sortedNodes = strategy.sortNodes(nodes, links);
        
        const aggregator = strategy.getInitialAggregator();
        const visitors = strategy.getVisitors();

        for (const node of sortedNodes) {
            const visitor = visitors[node.type] || visitors['default'];
            
            if (visitor) {
                await Promise.resolve(visitor(node, aggregator, { nodes, links }));
            }
        }

        return aggregator;
    }
}