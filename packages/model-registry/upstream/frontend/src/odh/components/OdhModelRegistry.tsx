import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  EmptyStateVariant,
  PageSection,
  Bullseye,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { WhosMyAdministrator } from 'mod-arch-shared';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isAdminCheckExtension } from '~/odh/extension-points';
import ModelRegistry from '~/app/pages/modelRegistry/screens/ModelRegistry';

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
            <Link to="/modelRegistrySettings">
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
  const [adminCheckExtensions, adminCheckExtensionsLoaded] =
    useResolvedExtensions(isAdminCheckExtension);

  if (adminCheckExtensionsLoaded && adminCheckExtensions.length > 0) {
    const AdminCheckComponent = adminCheckExtensions[0].properties.component.default;
    return (
      <AdminCheckComponent>
        {(isAdmin: boolean, loaded: boolean) => {
          if (!loaded) {
            return (
              <Bullseye>
                <Spinner />
              </Bullseye>
            );
          }
          return (
            <ModelRegistry
              {...props}
              unavailableErrorPage={<UnavailableErrorPage isAdmin={isAdmin} />}
            />
          );
        }}
      </AdminCheckComponent>
    );
  }

  // Fallback: no admin check extension, default to non-admin view
  return (
    <ModelRegistry
      {...props}
      unavailableErrorPage={<UnavailableErrorPage isAdmin={false} />}
    />
  );
};

export default OdhModelRegistry;
