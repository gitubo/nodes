import { TraverseStrategyDefinition } from '../../core/sdk.js';

export default class JavascriptAstStrategy extends TraverseStrategyDefinition {
    static get type() { return 'javascript_ast'; }

    sortNodes(nodes, links) {
        const startNode = nodes.find(n => n.type === 'start');
        return startNode ? [startNode] : [];
    }

    getInitialAggregator() {
        return {
            ast: {
                type: 'Program',
                body: []
            },
            code: '',
            visited: new Set() // To prevent infinite loops in the graph
        };
    }

    getVisitors() {
        return {
            'start': async (node, agg, context) => {
                const { nodes, links } = context;
                
                // Build the Function Wrapper AST
                const functionNode = {
                    type: 'FunctionDeclaration',
                    name: node.label?.replace(/\s+/g, '_') || 'myAlgorithm',
                    params: ['msg'],
                    body: [] 
                };
                
                agg.ast.body.push(functionNode);

                // Start the recursive engine immediately
                // We pass the function's body as the target container
                this._recursiveVisit(node, functionNode.body, agg, nodes, links);

                // Once recursion is finished, transform the final AST into string code
                agg.code = this._generateCode(agg.ast);
            }
        };
    }

    /**
     * Internal Recursive Engine
     * @param {Object} node - Current diagram node
     * @param {Array} container - The AST array where we push new instructions
     * @param {Object} agg - The aggregator (to access the visited Set)
     */
    _recursiveVisit(node, container, agg, allNodes, allLinks) {
        if (!node || agg.visited.has(node.id)) return;
        agg.visited.add(node.id);

        // --- Logic for branching (Switch) ---
        if (node.type === 'switch') {
            const ifNode = {
                type: 'IfStatement',
                test: node.data?.condition || 'true',
                consequent: [],
                alternate: []
            };
            container.push(ifNode);

            const outgoing = allLinks.filter(l => node.handlers.some(h => h.id === l.sourceHandlerId));
            
            outgoing.forEach(link => {
                const handler = node.handlers.find(h => h.id === link.sourceHandlerId);
                const target = allNodes.find(n => n.handlers.some(h => h.id === link.targetHandlerId));
                
                if (handler.label?.toLowerCase() === 'yes') {
                    this._recursiveVisit(target, ifNode.consequent, agg, allNodes, allLinks);
                } else if (handler.label?.toLowerCase() === 'no') {
                    this._recursiveVisit(target, ifNode.alternate, agg, allNodes, allLinks);
                }
            });
            return; // Stop linear flow for switch
        }

        // --- Logic for Linear operations (Filter/Map/Reduce) ---
        if (['filter', 'map', 'reduce'].includes(node.type)) {
            container.push({
                type: 'ChainMethod',
                method: node.type,
                content: this._getExpression(node)
            });
        }

        // --- Generic Linear Recursion ---
        const outgoingLinks = allLinks.filter(l => 
            node.handlers.some(h => h.id === l.sourceHandlerId)
        );

        outgoingLinks.forEach(link => {
            const targetNode = allNodes.find(n => n.handlers.some(h => h.id === link.targetHandlerId));
            this._recursiveVisit(targetNode, container, agg, allNodes, allLinks);
        });
    }

    _getExpression(node) {
        const d = node.data || {};
        if (node.type === 'filter') return d.condition || 'item => true';
        if (node.type === 'map')    return d.expression || 'item => item';
        if (node.type === 'reduce') return `${d.logic || '(a, b) => a + b'}, ${d.initial || '0'}`;
        return '';
    }

    _generateCode(ast, indent = 0) {
        const pad = '  '.repeat(indent);
        if (Array.isArray(ast)) return ast.map(n => this._generateCode(n, indent)).join('\n');
        
        switch (ast.type) {
            case 'Program': return this._generateCode(ast.body, indent);
            case 'FunctionDeclaration':
                return `const ${ast.name} = (${ast.params.join(', ')}) => {\n` +
                       `${pad}  return msg.items\n` +
                       `${this._generateCode(ast.body, indent + 2)};\n` +
                       `${pad}}`;
            case 'ChainMethod':
                return `${pad}.${ast.method}(${ast.content})`;
            case 'IfStatement':
                let code = `${pad}if (${ast.test}) {\n${this._generateCode(ast.consequent, indent + 1)}\n${pad}}`;
                if (ast.alternate.length > 0) {
                    code += ` else {\n${this._generateCode(ast.alternate, indent + 1)}\n${pad}}`;
                }
                return code;
            default: return '';
        }
    }
}