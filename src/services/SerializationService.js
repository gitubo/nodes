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

        // LINK: Trasformiamo i dati grezzi in Istanze
        const newLinks = Object.values(data.connections).map(linkData => {
            // Recupera la definizione in base al tipo salvato
            const LinkClass = this.registry.getConnectionDefinition(linkData.type || 'default');
            
            if (LinkClass) {
                // Creiamo l'istanza passando i dati grezzi al costruttore
                // Assumiamo che il costruttore accetti (data) e riempia i campi
                const instance = new LinkClass(linkData);
                return instance;
            } else {
                console.warn(`Unknown link type: ${linkData.type}`);
                return null;
            }
        }).filter(l => l !== null); // Rimuovi eventuali null

        return { 
            nodes: newNodes, 
            links: newLinks, 
            viewport: data.metadata?.viewport || { x: 0, y: 0, k: 1 } 
        };
    }
}