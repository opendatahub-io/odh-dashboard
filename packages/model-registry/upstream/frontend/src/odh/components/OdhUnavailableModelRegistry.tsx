import * as React from 'react';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { WhosMyAdministrator } from 'mod-arch-shared';
import {
  UNAVAILABLE_TITLE,
  getUnavailableBodyText,
} from '~/app/pages/modelRegistry/screens/UnavailableModelRegistry';

type OdhUnavailableModelRegistryProps = {
  registryDisplayName: string;
  isAdmin: boolean;
  settingsUrl: string;
  settingsTitle: string;
};

const getAdminBodyText = (registryDisplayName: string): string =>
  `The ${registryDisplayName} registry is currently unavailable. Check the registry configuration in settings to troubleshoot the issue.`;

const OdhUnavailableModelRegistry: React.FC<OdhUnavailableModelRegistryProps> = ({
  registryDisplayName,
  isAdmin,
  settingsUrl,
  settingsTitle,
}) => (
  <PageSection hasBodyWrapper={false} isFilled data-testid="unavailable-model-registry">
    <EmptyState
      headingLevel="h1"
      icon={ExclamationCircleIcon}
      titleText={UNAVAILABLE_TITLE}
      variant={EmptyStateVariant.lg}
    >
      <EmptyStateBody>
        {isAdmin
          ? getAdminBodyText(registryDisplayName)
          : getUnavailableBodyText(registryDisplayName)}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          {isAdmin ? (
            <Link to={settingsUrl} data-testid="registry-settings-link">
              Go to <b>{settingsTitle}</b>
            </Link>
          ) : (
            <WhosMyAdministrator linkTestId="whos-my-admin-link" />
          )}
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export default OdhUnavailableModelRegistry;
