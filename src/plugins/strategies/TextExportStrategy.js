// src/plugins/strategies/TextExportStrategy.js
import { TraverseStrategyDefinition } from '../../core/sdk.js';
// Importa le definizioni se vuoi essere strict sui tipi, oppure accetta la stringa
// Ma l'ideale è mantenere la logica flessibile.

export default class TextExportStrategy extends TraverseStrategyDefinition {
    static get type() { return 'text_export'; } // Fondamentale per il registry

    getInitialAggregator() {
        return { content: "--- REPORT ---\n", steps: 0 };
    }

    sortNodes(nodes, links) {
        // Puoi sovrascrivere l'ordinamento qui se vuoi
        // Es. filtrare nodi disconnessi prima di ordinare
        return super.sortNodes(nodes, links);
    }

    getVisitors() {
        return {
            'start': (node, agg) => {
                agg.content += `[START] ${node.id.substring(0,8)}\n`;
            },
            'task': (node, agg) => {
                agg.steps++;
                agg.content += `${agg.steps}. TASK: ${node.label || 'Unnamed'}\n`;
                // Accesso ai dati custom (Point 5 della tua richiesta precedente)
                if (node.data?.assignee) {
                    agg.content += `   Assigned to: ${node.data.assignee}\n`;
                }
            },
            // Gestione generica per i custom nodes (es. CircleNode)
            'default': (node, agg) => {
                agg.content += `?. UNKNOWN NODE (${node.type})\n`;
            }
        };
    }
}