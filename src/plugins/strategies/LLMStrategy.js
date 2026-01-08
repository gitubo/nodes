import { TraverseStrategyDefinition } from '../../core/sdk.js';

export default class JavascriptAstStrategy extends TraverseStrategyDefinition {
    static get type() { return 'javascript_ast'; }
    
    sortNodes(nodes, links) {
        const startNode = nodes.find(n => n.type === 'query');
        return startNode ? [startNode] : [];
    }
    
    getInitialAggregator() {
        return {
            code: '',
            visited: new Set()  // Buona idea tenerlo per evitare cicli
        };
    }
    
    getVisitors() {
        return {
            'query': (node, agg, context) => this._visitQuery(node, agg, context),
            'answer': (node, agg, context) => this._visitAnswer(node, agg, context),
            'storage': (node, agg, context) => this._visitStorage(node, agg, context),
            'llm_ba': (node, agg, context) => this._visitLLMBusinessAnalyst(node, agg, context),
            'llm_sa': (node, agg, context) => this._visitLLMSolutionArchitect(node, agg, context),
            'llm_cw': (node, agg, context) => this._visitLLMCopywriter(node, agg, context)
        };
    }
    
    _visitQuery(node, agg, context) {
        if (agg.visited.has(node.id)) return;
        agg.visited.add(node.id);
        
        agg.code += "query";
        agg.code += "(\"" + node.note + "\")";  
        
        const nextNode = this._getNextNode(node, 0, context);
        if (nextNode) {
            agg.code += ".";
            this._visitNode(nextNode, agg, context);
        }
    }

    
    _visitAnswer(node, agg, context) {
        if (agg.visited.has(node.id)) return;
        agg.visited.add(node.id);
        
        agg.code += "produce_answer()"; 
        
    }
    
    _visitStorage(node, agg, context) {
        console.log("Storage");
        if (agg.visited.has(node.id)) return;
        agg.visited.add(node.id);
        
        agg.code += "using_store(\"redis\")"; 

    }
    
    _visitLLMBusinessAnalyst(node, agg, context) { 
        if (agg.visited.has(node.id)) return;
        agg.visited.add(node.id);
        
        agg.code += "llm_ba";  
        agg.code += "(\"" + node.note + "\")";  
        
        const nextNodeStorage = this._getNextNode(node, 1, context);  
        if (nextNodeStorage) {
            agg.code += ".";  
            this._visitNode(nextNodeStorage, agg, context);
        }

        const nextNode = this._getNextNode(node, 2, context);  
        if (nextNode) {
            agg.code += "."
            this._visitNode(nextNode, agg, context);
        }

    }

    _visitLLMSolutionArchitect(node, agg, context) { 
        if (agg.visited.has(node.id)) return;
        agg.visited.add(node.id);
        
        agg.code += "llm_sa"; 
        agg.code += "(\"" + node.note + "\")";  
        
        const nextNodeStorage = this._getNextNode(node, 1, context);  
        if (nextNodeStorage) {
            agg.code += ".";  
            this._visitNode(nextNodeStorage, agg, context);
        }

        const nextNode = this._getNextNode(node, 2, context);  
        if (nextNode) {
            agg.code += "."
            this._visitNode(nextNode, agg, context);
        }
    }

    _visitLLMCopywriter(node, agg, context) {  
        if (agg.visited.has(node.id)) return;
        agg.visited.add(node.id);
        
        agg.code += "llm_cw";  
        agg.code += "(\"" + node.note + "\")";  
        
        const nextNodeStorage = this._getNextNode(node, 1, context);  
        if (nextNodeStorage) {
            agg.code += ".";  
            this._visitNode(nextNodeStorage, agg, context);
        }

        const nextNode = this._getNextNode(node, 2, context);  
        if (nextNode) {
            agg.code += "."
            this._visitNode(nextNode, agg, context);
        }
    }

    /**
     * Generic node visitor - dispatches to specific visitor
     */
    _visitNode(node, agg, context) {
        if (!node || agg.visited.has(node.id)) return;

        const visitor = this.getVisitors()[node.type];
        if (visitor) {
            visitor.call(this, node, agg, context);
        } else {
            console.warn(`No visitor defined for node type: ${node.type}`);
        }
    }
    
    /**
     * Get the next node connected to a specific handler
     * @param {Object} node - Current node
     * @param {number} handlerIndex - Index of the handler to follow
     * @param {Object} context - Contains nodes and links
     */
    _getNextNode(node, handlerIndex, context) {
        const { nodes, links } = context;
        
        if (!node.handlers || handlerIndex >= node.handlers.length) {
            return null;
        }
        
        const handler = node.handlers[handlerIndex];
        const link = links.find(l => l.sourceHandlerId === handler.id);
        
        if (!link) return null;
        
        return nodes.find(n => 
            n.handlers.some(h => h.id === link.targetHandlerId)
        );
    }
}