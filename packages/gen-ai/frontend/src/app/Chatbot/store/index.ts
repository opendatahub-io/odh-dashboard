/**
 * Chatbot configuration store exports
 */

export { useChatbotConfigStore } from './useChatbotConfigStore';
export * from './selectors';
export * from './types';

/**
 * Default config ID used for the initial/single chat configuration
 */
export const DEFAULT_CONFIG_ID = 'default';

/**
 * Get display label for a config based on its index position.
 * This allows the store to use dynamic IDs while UI shows "Model 1", "Model 2", etc.
 */
export const getConfigDisplayLabel = (index: number): string => `Model ${index + 1}`;
