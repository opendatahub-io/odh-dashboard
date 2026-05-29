import * as React from 'react';
import { Button, Content, ContentVariants, List, ListItem, Popover } from '@patternfly/react-core';
import { SubscriptionDetail } from '~/app/types/api-key';

type SubscriptionCellProps = {
  subscriptionName?: string;
  subscriptionDetail?: SubscriptionDetail;
};

const SubscriptionCell: React.FC<SubscriptionCellProps> = ({
  subscriptionName,
  subscriptionDetail,
}) => {
  if (!subscriptionName) {
    return <>—</>;
  }

  const displayLabel = subscriptionDetail?.displayName || subscriptionName;

  if (!subscriptionDetail || subscriptionDetail.models.length === 0) {
    return <>{displayLabel}</>;
  }

  const modelCount = subscriptionDetail.models.length;

  return (
    <Popover
      headerContent={displayLabel}
      bodyContent={
        <div data-testid="subscription-popover-body">
          <Content component={ContentVariants.small}>
            {modelCount} {modelCount === 1 ? 'model' : 'models'}
          </Content>
          <List isPlain>
            {subscriptionDetail.models.map((model) => (
              <ListItem key={model}>
                <Content component={ContentVariants.small}>{model}</Content>
              </ListItem>
            ))}
          </List>
        </div>
      }
    >
      <Button variant="link" isInline data-testid="subscription-popover-button">
        {displayLabel}
      </Button>
    </Popover>
  );
};

export default SubscriptionCell;
