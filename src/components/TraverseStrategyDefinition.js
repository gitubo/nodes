// /src/components/TraverseStrategyDefinition.js

export class TraverseStrategyDefinition {
    /**
     * Requirement 1: Initialize the data structure that will hold results
     */
    getInitialAggregator() {
        return {};
    }

    /**
     * Define visitors for each node type
     */
    getVisitors() {
        return {};
    }

    /**
     * Requirement 2: Connection-based sorting (Topological Sort)
     */
    sortNodes(nodes, links) {
        const sorted = [];
        const inDegree = new Map();
        const adjacency = new Map();

        // Initialize maps
        nodes.forEach(node => {
            inDegree.set(node.id, 0);
            adjacency.set(node.id, []);
        });

        // Map links to node-to-node relationships
        links.forEach(link => {
            // Find nodes by their handler IDs
            const sourceNode = nodes.find(n => n.handlers?.some(h => h.id === link.sourceHandlerId));
            const targetNode = nodes.find(n => n.handlers?.some(h => h.id === link.targetHandlerId));

            if (sourceNode && targetNode) {
                adjacency.get(sourceNode.id).push(targetNode.id);
                inDegree.set(targetNode.id, inDegree.get(targetNode.id) + 1);
            }
        });

        // 1. Starting points: Nodes with no inbound connections (Requirement 2.1)
        const queue = nodes
            .filter(n => inDegree.get(n.id) === 0)
            .map(n => n.id);

        // 2. Process BFS-style (Requirement 2.2)
        const visited = new Set();
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) continue;
            
            const node = nodes.find(n => n.id === currentId);
            sorted.push(node);
            visited.add(currentId);

            adjacency.get(currentId).forEach(neighborId => {
                inDegree.set(neighborId, inDegree.get(neighborId) - 1);
                if (inDegree.get(neighborId) === 0) {
                    queue.push(neighborId);
                }
            });
        }

        // Add disconnected nodes that might have been missed
        nodes.forEach(n => {
            if (!visited.has(n.id)) sorted.push(n);
        });

        return sorted;
    }
}