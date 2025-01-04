import {
  PageSection,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Button,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EitherOrNone } from '~/typeHelpers';

type RedirectErrorStateProps = {
  title?: string;
  errorMessage?: string;
} & EitherOrNone<
  {
    fallbackUrl: string;
    fallbackText: string;
  },
  {
    actions: React.ReactNode | React.ReactNode[];
  }
>;

/**
 * A component that displays an error state with optional title, message and actions
 * Used for showing redirect/navigation errors with fallback options
 *
 * Props for the RedirectErrorState component
 * @property {string} [title] - Optional title text to display in the error state
 * @property {string} [errorMessage] - Optional error message to display
 * @property {string} [fallbackUrl] - URL to navigate to when fallback button is clicked
 * @property {React.ReactNode | React.ReactNode[]} [actions] - Custom action buttons/elements to display
 *
 * Note: The component accepts either fallbackUrl OR actions prop, but not both.
 * This is enforced by the EitherOrNone type helper.
 *
 * @example
 * ```tsx
 * // With fallback URL
 * <RedirectErrorState
 *   title="Error redirecting to pipelines"
 *   errorMessage={error.message}
 *   fallbackUrl="/pipelines"
 * />
 *
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

const RedirectErrorState: React.FC<RedirectErrorStateProps> = ({
  title,
  errorMessage,
  fallbackUrl,
  fallbackText,
  actions,
}) => {
  const navigate = useNavigate();

  return (
    <PageSection hasBodyWrapper={false} isFilled>
      <EmptyState
        headingLevel="h1"
        icon={ExclamationCircleIcon}
        titleText={title ?? 'Error redirecting'}
        variant={EmptyStateVariant.lg}
        data-testid="redirect-error"
      >
        {errorMessage && <EmptyStateBody>{errorMessage}</EmptyStateBody>}
        {fallbackUrl && (
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="link" onClick={() => navigate(fallbackUrl)}>
                {fallbackText}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        )}
        {actions && (
          <EmptyStateFooter>
            <EmptyStateActions>{actions}</EmptyStateActions>
          </EmptyStateFooter>
        )}
      </EmptyState>
    </PageSection>
  );
};

export default RedirectErrorState;
