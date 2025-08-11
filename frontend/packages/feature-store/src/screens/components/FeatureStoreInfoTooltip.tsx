import * as React from 'react';
import { Flex, Popover, Stack, StackItem, Title } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';

type FeatureStoreInfoTooltipProps = {
  wrap?: boolean;
  title?: string;
  children: React.ReactNode;
};

const FeatureStoreInfoTooltip: React.FC<FeatureStoreInfoTooltipProps> = ({
  title,
  wrap = true,
  children,
}) => (
  <div style={{ display: wrap ? 'block' : 'inline-flex' }}>
    <Flex
      flexWrap={{ default: 'nowrap' }}
      gap={{ default: 'gapXs' }}
      alignItems={{ default: 'alignItemsCenter' }}
    >
      <Popover
        position="top"
        bodyContent={
          <Stack hasGutter>
            {title && (
              <StackItem>
                <Title headingLevel="h3">{title}</Title>
              </StackItem>
            )}
            <StackItem>{children}</StackItem>
          </Stack>
        }
      >
        <DashboardPopupIconButton
          data-testid="resource-name-icon-button"
          icon={<OutlinedQuestionCircleIcon />}
          aria-label="More info"
          style={{ paddingTop: 0, paddingBottom: 0 }}
        />
      </Popover>
    </Flex>
  </div>
);

export default FeatureStoreInfoTooltip;
