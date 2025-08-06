import React from 'react';
type RedirectErrorStateProps = {
    title?: string;
    errorMessage?: string;
    actions?: React.ReactNode | React.ReactNode[];
};
/**
 * A component that displays an error state with optional title, message and actions
 * Used for showing redirect/navigation errors with fallback options
 *
 * Props for the RedirectErrorState component
 * @property {string} [title] - Optional title text to display in the error state
 * @property {string} [errorMessage] - Optional error message to display
 * @property {React.ReactNode | React.ReactNode[]} [actions] - Custom action buttons/elements to display
 *
 *
 * @example
 * ```tsx
 * // With custom actions
 * <RedirectErrorState
 *   title="Error redirecting to pipelines"
 *   errorMessage={error.message}
 *   actions={
 *     <>
 *       <Button variant="link" onClick={() => navigate('/pipelines')}>
 *         Go to pipelines
 *       </Button>
 *       <Button variant="link" onClick={() => navigate('/experiments')}>
 *         Go to experiments
 *       </Button>
 *     </>
 *   }
 * />
 * ```
 */
declare const RedirectErrorState: React.FC<RedirectErrorStateProps>;
export default RedirectErrorState;
