// src/SerializationService.js

export class SerializationService {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Serializes the current graph state into a plain object.
     * Sanitizes data to remove runtime instances (like handler.instance)
     * and derived arrays (like sourceHandlers) to prevent circular ref errors.
     */
    serialize(state) {
        const exportData = {
            metadata: {
                version: '0.1', 
                createdAt: new Date().toISOString(),
                viewport: {
                    x: state.transform.x || 0,
                    y: state.transform.y || 0,
                    k: state.transform.k || 1 
                }
            },
            nodes: {},
            connections: {}
        };

        state.nodes.forEach(node => {
            const definition = this.registry.getNodeDefinition(node.type);
            if (!definition) {
                console.warn(`[Serialization] node type ${node.type} is not defined into the Registry`);
                return;
            }
            exportData.nodes = { 
                ...exportData.nodes, 
                ...definition.serialize(node, this.registry)
            };
        });

        state.links.forEach(link => {
            exportData.connections[link.id] = { ...link };
        });

        return exportData;
    }

    /**
     * Deserializes plain object data back into class instances.
     */
    deserialize(data) {
        if (!data || !data.nodes || !data.connections) {
            return { nodes: [], links: [] };
        }
        
        const viewportState = data.metadata?.viewport || { x: 0, y: 0, k: 1 };

        const newNodes = [];

        Object.entries(data.nodes).forEach(([nodeId, nodeData]) => {
            const NodeClass = this.registry.getNodeDefinition(nodeData.type);
            if (!NodeClass) {
                console.warn(`No definition for node type ${nodeData.type}. Skipping node with ID: ${nodeId}`);
                return;
            }
            
            nodeData.id = nodeId;
            const instance = NodeClass.deserialize(nodeData, this.registry);
            
            newNodes.push(instance);
        });

        const newLinks = Object.values(data.connections).map(l => ({
            id: l.id,
            source: l.source,
            target: l.target,
            sourceHandlerId: l.sourceHandlerId || l.sourceHandler,
            targetHandlerId: l.targetHandlerId || l.targetHandler,
            label: l.label
        }));

        return { nodes: newNodes, links: newLinks, viewport: viewportState };
    }
}