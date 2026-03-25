import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useAccessAllowed, verbModelAccess } from '#~/concepts/userSSAR';
import { ModelRegistryModel } from '#~/api/models';
import { modelRegistrySettingsRoute } from '#~/routes/modelRegistry/registryBase';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import ModelRegistry from './ModelRegistry';

type OdhModelRegistryProps = React.ComponentProps<typeof ModelRegistry>;

const UnavailableErrorPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => (
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h1"
      icon={ExclamationCircleIcon}
      titleText="Model registry unavailable"
      variant={EmptyStateVariant.lg}
      data-testid="model-registry-unavailable-error"
    >
      <EmptyStateBody>
        {isAdmin
          ? 'The model registry is unavailable. Check the registry configuration in settings to troubleshoot the issue.'
          : 'The model registry is unavailable. If the problem persists, contact your administrator.'}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          {isAdmin ? (
            <Link to={modelRegistrySettingsRoute()}>
              Go to <b>AI registry settings</b>
            </Link>
          ) : (
            <WhosMyAdministrator />
          )}
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

/**
 * ODH-specific wrapper around ModelRegistry that provides admin-aware
 * error messaging when a model registry is unavailable.
 */
const OdhModelRegistry: React.FC<OdhModelRegistryProps> = (props) => {
  const [isAdmin] = useAccessAllowed(verbModelAccess('create', ModelRegistryModel));

  return (
    <ModelRegistry {...props} unavailableErrorPage={<UnavailableErrorPage isAdmin={isAdmin} />} />
  );
};

export default OdhModelRegistry;
