// src/nodes/NodeDefinition.js
import { CONFIG } from '../config.js';

export class NodeDefinition {
    constructor(x, y, label, note, data) {
        this.id = crypto.randomUUID();
        this.type = 'base';
        this.label = label;
        this.note = note;
        this.width = CONFIG.node.width;
        this.height = CONFIG.node.height;
        this.handlers = [];
        this.position = {x: x, y: y};
        this.data = data;
    }

    static serialize(node, registry) {
        let serializedHandlers = {};
        if (node.handlers) {
            serializedHandlers = node.handlers.reduce((handles, handle) => {
                const HandlerDef = registry.getHandlerDefinition(handle.type);
                if (!HandlerDef) {
                    console.warn(`[Serialization] Handler type ${handle.type} not defined in Registry.`);
                } else {
                    handles = { 
                        ...handles, 
                        ...HandlerDef.serialize(handle)
                    };
                }
                return handles;
            }, {});
        }
        
        return {
            [node.id] : {
                type: node.type, 
                label: node.label,
                note: node.note,
                data: node.data || {},
                handles: serializedHandlers,
                presentation: {
                    position: {
                        x: node.position.x, 
                        y: node.position.y
                    }
                }
            }
        };
    }

    static deserialize(nodeData, registry) {
        const instance = new this(
            nodeData.presentation?.position?.x || 0, 
            nodeData.presentation?.position?.y || 0,
            nodeData.label,
            nodeData.note,
            nodeData.data
        );
        
        instance.id = nodeData.id;
    //    instance.type = nodeData.type;

        instance.handlers = []; // Sovrascriviamo per assicurarci di usare solo i dati deserializzati
        const serializedHandles = nodeData.handles || {};
        
        Object.entries(serializedHandles).forEach(([handleId, handleData]) => {
            const HandlerClass = registry.getHandlerDefinition(handleData.type);
            if (HandlerClass) {
                const instanceHandle = HandlerClass.deserialize(handleData, handleId);
                instance.handlers.push(instanceHandle);
            } else {
                 console.warn(`[Deserialization] Handler type ${handleData.type} not defined in Registry. Skipping.`);
            }
        });

        return instance;
    }

    static hasTargetHandlers() { return false; }

    getHandlers() { return this.handlers || []; }
    getDimensions() { return { width: this.width, height: this.height }; }
    static getIconPath() { return ''; }

    getShapePath() { 
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const sR = CONFIG.node.smallBorderRadius;

        return `
            M ${sR},0
            L ${W - sR},0
            A ${sR},${sR} 0 0 1 ${W},${sR}
            L ${W},${H - sR}
            A ${sR},${sR} 0 0 1 ${W},${H - sR}
            L ${W},${H - sR}
            A ${sR},${sR} 0 0 1 ${W - sR},${H}
            L ${sR},${H}
            A ${sR},${sR} 0 0 1 0,${H - sR}
            L 0,${sR}
            A ${sR},${sR} 0 0 1 ${sR},0
            Z
        `.replace(/\s+/g, ' ');
    }
        
    static renderProperties(container, nodeData, onChange) {
        // This logic remains as it's UI-specific for the properties panel
    }
}