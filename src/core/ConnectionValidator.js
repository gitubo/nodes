/**
 * Connection Validation Logic
 * Defines the strict truth table for handler interoperability.
 */

const VALID_CONNECTIONS = {
    'in':  ['out', 'any'],
    'out': ['in', 'any'],
    'bi':  ['bi', 'any'],
    'any': ['in', 'out', 'bi', 'any']
};

export class ConnectionValidator {
    
    /**
     * Checks if two handlers can strictly connect based on their Flow property.
     * @param {Object} sourceHandler - The handler where the link starts
     * @param {Object} targetHandler - The handler where the link ends
     * @returns {boolean}
     */
    static isValid(sourceHandler, targetHandler) {
        if (!sourceHandler || !targetHandler) return false;
        if (sourceHandler.id === targetHandler.id) return false; // No self-linking handlers

        // Default to 'any' if flow is missing to preserve backward compatibility
        const sFlow = sourceHandler.flow || 'any';
        const tFlow = targetHandler.flow || 'any';

        const allowedTargets = VALID_CONNECTIONS[sFlow];
        
        if (!allowedTargets) {
            console.warn(`Unknown flow type: ${sFlow}`);
            return false;
        }

        return allowedTargets.includes(tFlow);
    }
}