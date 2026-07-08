import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { CubesIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { URL_PREFIX } from '~/app/utilities/const';

type EmptyStatePageProps = {
  title?: string;
  cubeIcon?: boolean;
  bodyText?: string;
  returnTo?: string;
  showSubsButton?: boolean;
  showPoliciesButton?: boolean;
  testId?: string;
};

const EmptyStatePage: React.FC<EmptyStatePageProps> = ({
  title,
  cubeIcon = false,
  bodyText,
  returnTo,
  showSubsButton = false,
  showPoliciesButton = false,
  testId,
}) => {
  const navState = returnTo ? { returnTo } : undefined;

  return (
    <>
      <EmptyState
        titleText={title}
        headingLevel="h3"
        variant="lg"
        data-testid={testId}
        icon={cubeIcon ? CubesIcon : PlusCircleIcon}
      >
        <EmptyStateBody>{bodyText}</EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            {showSubsButton && (
              <Button
                variant="primary"
                component={(props) => (
                  <Link {...props} to={`${URL_PREFIX}/subscriptions/create`} state={navState} />
                )}
                data-testid="create-subscription-button"
              >
                Create subscription
              </Button>
            )}
            {showPoliciesButton && (
              <Button
                variant="primary"
                component={(props) => (
                  <Link {...props} to={`${URL_PREFIX}/auth-policies/create`} state={navState} />
                )}
                data-testid="create-auth-policy-button"
              >
                Create authorization policy
              </Button>
            )}
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </>
  );
};

export default EmptyStatePage;
