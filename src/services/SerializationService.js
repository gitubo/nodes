export class SerializationService {
    constructor(registry) {
        this.registry = registry;
    }

    serialize(state) {
        const exportData = {
            metadata: {
                version: '0.1', 
                createdAt: new Date().toISOString(),
                viewport: { ...state.transform }
            },
            nodes: {},
            connections: {}
        };

        // 1. Serialize Nodes 
        state.nodes.forEach(node => {
            if (typeof node.getData === 'function') {
                exportData.nodes[node.id] = node.getData();
            }
        });

        // 2. Serialize Links 
        state.links.forEach(link => {
            if (typeof link.getData === 'function') {
                exportData.connections[link.id] = link.getData();
            } else {
                console.warn(`Link ${link.id} missing getData()`);
                exportData.connections[link.id] = { ...link }; 
            }
        });

        return exportData;
    }

    deserialize(data) {
        if (!data || !data.nodes || !data.connections) {
            return { nodes: [], links: [] };
        }
        
        const viewport = data.metadata?.viewport || { x: 0, y: 0, k: 1 };
        const newNodes = [];

        // Restore Nodes
        Object.values(data.nodes).forEach(nodeData => {
            const NodeClass = this.registry.getNodeDefinition(nodeData.type);
            if (NodeClass) {
                // Static deserialize creates the instance
                const instance = NodeClass.deserialize(nodeData, this.registry);
                newNodes.push(instance);
            }
        });

        // Restore Links
        const newLinks = Object.values(data.connections).map(linkData => {
            const LinkClass = this.registry.getConnectionDefinition(linkData.type || 'default');
            if (LinkClass) {
                return new LinkClass(linkData);
            }
            return null;
        }).filter(l => l !== null);

        return { nodes: newNodes, links: newLinks, viewport };
    }
}