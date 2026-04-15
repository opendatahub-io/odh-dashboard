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
import { WhosMyAdministrator } from 'mod-arch-shared';
import { useResolvedExtensions, useExtensions } from '@odh-dashboard/plugin-core';
import { isAdminCheckExtension, isRegistrySettingsUrlExtension } from '~/odh/extension-points';
import { REGISTRY_SETTINGS_PAGE_TITLE, REGISTRY_SETTINGS_URL } from '~/odh/const';
import ModelRegistry from '~/app/pages/modelRegistry/screens/ModelRegistry';

type OdhModelRegistryProps = React.ComponentProps<typeof ModelRegistry>;

type UnavailableErrorPageProps = {
  isAdmin: boolean;
  settingsUrl: string;
  settingsTitle: string;
};

const UnavailableErrorPage: React.FC<UnavailableErrorPageProps> = ({
  isAdmin,
  settingsUrl,
  settingsTitle,
}) => (
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
            <Link to={settingsUrl}>
              Go to <b>{settingsTitle}</b>
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
 *
 * Always renders ModelRegistry immediately so the page header and description
 * are visible while the admin check resolves. The custom error page is only
 * injected once admin status is known.
 */
const OdhModelRegistry: React.FC<OdhModelRegistryProps> = (props) => {
  const [adminCheckExtensions, adminCheckExtensionsLoaded] =
    useResolvedExtensions(isAdminCheckExtension);
  const registrySettingsUrlExtensions = useExtensions(isRegistrySettingsUrlExtension);

  const settingsUrl =
    registrySettingsUrlExtensions.length > 0
      ? registrySettingsUrlExtensions[0].properties.url
      : REGISTRY_SETTINGS_URL;

  const settingsTitle =
    registrySettingsUrlExtensions.length > 0
      ? registrySettingsUrlExtensions[0].properties.title
      : REGISTRY_SETTINGS_PAGE_TITLE;

  if (adminCheckExtensionsLoaded && adminCheckExtensions.length > 0) {
    const AdminCheckComponent = adminCheckExtensions[0].properties.component.default;
    return (
      <AdminCheckComponent>
        {(isAdmin: boolean, loaded: boolean) => (
          <ModelRegistry
            {...props}
            unavailableErrorPage={
              loaded ? (
                <UnavailableErrorPage
                  isAdmin={isAdmin}
                  settingsUrl={settingsUrl}
                  settingsTitle={settingsTitle}
                />
              ) : undefined
            }
          />
        )}
      </AdminCheckComponent>
    );
  }

  return (
    <ModelRegistry
      {...props}
      unavailableErrorPage={
        adminCheckExtensionsLoaded ? (
          <UnavailableErrorPage
            isAdmin={false}
            settingsUrl={settingsUrl}
            settingsTitle={settingsTitle}
          />
        ) : undefined
      }
    />
  );
};

export default OdhModelRegistry;
