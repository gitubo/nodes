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
            nodes: {},
            connections: {}
        };

        state.nodes.forEach(node => {
            // 1. Shallow copy the node to avoid mutating the store
            const nodeCopy = { ...node };

            // 2. Clean 'handlers' array: remove 'instance' property added by Renderer
            if (nodeCopy.handlers) {
                nodeCopy.handlers = nodeCopy.handlers.map(h => {
                    // Destructure to separate 'instance' from the rest of the data
                    const { instance, ...cleanHandler } = h;
                    return cleanHandler;
                });
            }

            // 3. Remove derived/redundant arrays that cause circular reference issues during JSON.stringify
            // These are re-calculated by the Node class constructor during deserialize.
            delete nodeCopy.sourceHandlers;
            delete nodeCopy.targetHandlers;

            exportData.nodes[node.id] = nodeCopy;
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

            // Re-create the node instance (this restores default handlers and derived arrays)
            const instance = new NodeClass(nodeData.position?.x || 0, nodeData.position?.y || 0);
            
            // Overwrite standard properties
            instance.id = nodeData.id;
            instance.type = nodeData.type;
            instance.position = { x: nodeData.position?.x || 0, y: nodeData.position?.y || 0 };
            instance.label = nodeData.label;
            instance.note = nodeData.note;
            instance.data = nodeData.data || {};
            
            // Restore persisted handlers (merging with defaults if needed, or overwriting)
            if (nodeData.handlers && Array.isArray(nodeData.handlers)) {
                // We map back the saved data to the handlers
                instance.handlers = nodeData.handlers.map(h => ({
                    ...h,
                    offset_x: h.offset?.x || 0,
                    offset_y: h.offset?.y || 0
                }));
            }

            // Restore type-specific data (Switch Node logic)
            if (nodeData.type === 'switch') {
                instance.condition = nodeData.condition;
                // Re-bind the derived arrays to the restored handlers
                instance.sourceHandlers = instance.handlers.filter(h => h.role === 'source');
                instance.targetHandlers = instance.handlers.filter(h => h.role === 'target');
            }
            
            return instance;
        }).filter(Boolean);

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