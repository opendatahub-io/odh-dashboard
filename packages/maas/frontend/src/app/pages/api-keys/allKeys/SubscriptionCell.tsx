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

  if (!subscriptionDetail || subscriptionDetail.models.length === 0) {
    return <>{subscriptionName}</>;
  }

  const modelCount = subscriptionDetail.models.length;

  return (
    <Popover
      headerContent={subscriptionName}
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
        {subscriptionName}
      </Button>
    </Popover>
  );
};

export default SubscriptionCell;
