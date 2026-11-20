import { Button, ClipboardCopy, Content, ContentVariants, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';

const SubscriptionInfoPopover: React.FC<{
  displayName: string;
  subscriptionId: string;
  description?: string;
}> = ({ displayName, subscriptionId, description }) => (
  <Popover
    headerContent={displayName}
    bodyContent={
      <div data-testid="api-key-subscription-info-popover-body">
        <Content
          component={ContentVariants.small}
          className="pf-v6-u-mb-0 pf-v6-u-font-weight-bold"
        >
          Subscription ID
        </Content>
        <ClipboardCopy
          isReadOnly
          hoverTip="Copy"
          clickTip="Copied"
          data-testid="api-key-subscription-id-copy"
        >
          {subscriptionId}
        </ClipboardCopy>
        {description ? (
          <>
            <Content
              component={ContentVariants.small}
              className="pf-v6-u-mt-sm pf-v6-u-mb-0 pf-v6-u-font-weight-bold"
            >
              Description
            </Content>
            <Content component={ContentVariants.p} className="pf-v6-u-mt-0">
              {description}
            </Content>
          </>
        ) : null}
      </div>
    }
  >
    <Button
      variant="plain"
      aria-label={`More info about ${displayName}`}
      className="pf-v6-u-p-0"
      data-testid="api-key-subscription-info-button"
    >
      <OutlinedQuestionCircleIcon />
    </Button>
  </Popover>
);

export default SubscriptionInfoPopover;
