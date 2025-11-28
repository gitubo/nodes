// src/SerializationService.js

export class SerializationService {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Serializes the current graph state into a plain object.
     */
    serialize(state) {
        const exportData = {
            nodes: {},
            connections: {}
        };

        state.nodes.forEach(node => {
            // Node objects are already plain data, just spread them
            exportData.nodes[node.id] = { ...node };
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

        const newNodes = Object.values(data.nodes).map(nodeData => {
            const NodeClass = this.registry.getNodeDefinition(nodeData.type);
            if (!NodeClass) {
                console.warn(`No definition for node type ${nodeData.type}`);
                return null;
            }

            // Re-create the node instance from the data
            // This runs the constructor (which sets up default handlers)
            const instance = new NodeClass(nodeData.position?.x || 0, nodeData.position?.y || 0);
            
            // Overwrite all properties from the saved data
            instance.id = nodeData.id;
            instance.type = nodeData.type;
            instance.position = { x: nodeData.position?.x || 0, y: nodeData.position?.y || 0 };
            instance.label = nodeData.label;
            instance.note = nodeData.note;
            instance.data = nodeData.data || {};
            
            // Restore handlers
            instance.handlers = (nodeData.handlers || []).map(h => ({
                ...h,
                // Restore deprecated fields for D3 rendering if needed
                offset_x: h.offset?.x || 0,
                offset_y: h.offset?.y || 0
            }));
            
            // Restore type-specific data
            if (nodeData.type === 'switch') {
                instance.condition = nodeData.condition;
                instance.sourceHandlers = instance.handlers.filter(h => h.role === 'source');
                instance.targetHandlers = instance.handlers.filter(h => h.role === 'target');
            }
            
            return instance;
        }).filter(Boolean); // Remove any nulls from failed lookups

        const newLinks = Object.values(data.connections).map(l => ({
            id: l.id,
            source: l.source,
            target: l.target,
            sourceHandlerId: l.sourceHandlerId || l.sourceHandler,
            targetHandlerId: l.targetHandlerId || l.targetHandler,
            label: l.label
        }));

        return { nodes: newNodes, links: newLinks };
    }
}