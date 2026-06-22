import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  List,
  ListItem,
  Popover,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, SearchIcon } from '@patternfly/react-icons';
import apiKeysEmptyStateImg from '@odh-dashboard/internal/images/empty-state-api-keys.svg';

type EmptySubscriptionsTabStateProps = {
  hasData: boolean;
  variant: 'subscription' | 'model';
};

const EmptySubscriptionsTabState: React.FC<EmptySubscriptionsTabStateProps> = ({
  hasData,
  variant,
}) => {
  if (!hasData) {
    return (
      <EmptyState
        data-testid={`empty-${variant}s`}
        headingLevel="h3"
        titleText="Request a subscription"
        variant="sm"
        icon={() => <img src={apiKeysEmptyStateImg} alt="Request a subscription" />}
      >
        <EmptyStateBody>
          Subscriptions give you access to models. To request a subscription, contact your
          administrator.
        </EmptyStateBody>
        <EmptyStateFooter>
          <Popover
            headerContent="Who's my administrator?"
            bodyContent={
              <>
                Your administrator might be:
                <List>
                  <ListItem>
                    The person who assigned you your username, or who helped you log in for the
                    first time
                  </ListItem>
                  <ListItem>Someone in your IT department or help desk</ListItem>
                  <ListItem>A project manager or developer</ListItem>
                  <ListItem>Your professor (at a school)</ListItem>
                </List>
              </>
            }
          >
            <Button variant="link" icon={<OutlinedQuestionCircleIcon />}>
              Who&#39;s my administrator?
            </Button>
          </Popover>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  return (
    <EmptyState
      data-testid={`empty-${variant}s-filter`}
      headingLevel="h3"
      titleText="No results found"
      variant="sm"
      icon={SearchIcon}
    >
      <EmptyStateBody>
        {`No ${variant}s match the current filters or search criteria.`}
      </EmptyStateBody>
    </EmptyState>
  );
};

export default EmptySubscriptionsTabState;
