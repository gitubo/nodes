/**
 * Plugin: Text Summary Export
 * Creates a human-readable text report of the flow.
 */
export default {
    // 1. Mandatory 'type' for Registry lookup
    type: 'text_export',

    // 2. Lifecycle: On Start (Setup the aggregator)
    onStart: (aggregator) => {
        return {
            timestamp: new Date().toISOString(),
            lines: ["--- DIAGRAM REPORT ---", ""]
        };
    },

    // 3. Lifecycle: Sort (Topological or Visual sort)
    sortNodes: (nodes, links) => {
        // Simple visual sort: Top-to-Bottom, Left-to-Right
        return [...nodes].sort((a, b) => {
            const dy = a.position.y - b.position.y;
            return dy !== 0 ? dy : a.position.x - b.position.x;
        });
    },

    // 4. Visitors
    visitors: {
        'start': (node, agg) => {
            agg.lines.push(`[START] Node ${node.id.substr(0,4)}`);
            return agg;
        },
        'task': (node, agg, ctx) => {
            const inputs = ctx.inputs.map(l => l.sourceHandlerId.substr(0,4)).join(", ");
            agg.lines.push(`[TASK]  "${node.label}" (Inputs: ${inputs})`);
            return agg;
        },
        'switch': (node, agg) => {
            agg.lines.push(`[CHECK] Condition: ${node.condition || 'N/A'}`);
            return agg;
        },
        'end': (node, agg) => {
            agg.lines.push(`[END]   Process Finished.`);
            return agg;
        },
        'default': (node, agg) => {
            agg.lines.push(`[${node.type.toUpperCase()}]`);
            return agg;
        }
    },

    // 5. Lifecycle: On End (Final formatting)
    onEnd: (agg) => {
        agg.lines.push("", "--- END REPORT ---");
        // Return the final output payload
        return agg.lines.join("\n");
    }
};