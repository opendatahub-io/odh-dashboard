import { type UserInteractionAPI } from './UserInteractionContext';
/**
 * Returns the user interaction tracking API from context.
 *
 * In standalone mode this is a dev-mode console logger.
 * When a downstream provider is mounted (e.g., ODH Segment), returns that implementation.
 */
export declare const useUserInteraction: () => UserInteractionAPI;
