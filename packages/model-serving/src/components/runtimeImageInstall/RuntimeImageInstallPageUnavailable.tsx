import React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from '@odh-dashboard/ui-core';

type RuntimeImageInstallPageUnavailableProps = {
  title: string;
  message: string;
  returnRoute: string;
};

const RuntimeImageInstallPageUnavailable: React.FC<RuntimeImageInstallPageUnavailableProps> = ({
  title,
  message,
  returnRoute,
}) => (
  <ApplicationsPage
    title={title}
    loaded
    empty
    emptyStatePage={
      <PageSection hasBodyWrapper={false} isFilled>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to install this runtime image"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{message}</EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant="primary"
                component={(props: React.ComponentProps<'a'>) => (
                  <Link {...props} to={returnRoute} />
                )}
              >
                Go back
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </PageSection>
    }
  />
);

export default RuntimeImageInstallPageUnavailable;
