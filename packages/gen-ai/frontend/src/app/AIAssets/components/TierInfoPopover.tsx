import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Content,
  Flex,
  FlexItem,
  Label,
  Popover,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

const TierInfoPopover: React.FC = () => (
  <Popover
    aria-label="Tier information"
    headerContent={
      <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
        Tier information
      </Content>
    }
    bodyContent={
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
        <FlexItem>
          <Label color="purple">Work in progress</Label>
        </FlexItem>
        <FlexItem>
          <Content>
            This list of models is based on your current highest Tier that determines which ones you
            can access.
          </Content>
        </FlexItem>
      </Flex>
    }
  >
    <Button
      variant={ButtonVariant.link}
      icon={<OutlinedQuestionCircleIcon />}
      data-testid="tier-info-button"
    >
      Tier information
    </Button>
  </Popover>
);

export default TierInfoPopover;
