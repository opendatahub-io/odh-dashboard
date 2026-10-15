import * as React from 'react';
import {
  ClipboardCopy,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Flex,
  FlexItem,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import DashboardPopupIconButton from './DashboardPopupIconButton';

type ResourceNameTooltipProps = {
  resource: K8sResourceCommon;
  children: React.ReactNode;
  wrap?: boolean;
  onShowPopover?: () => void;
  description?: string;
  descriptionMaxLines?: number;
  withFocusTrap?: boolean;
};

const ResourceNameTooltip: React.FC<ResourceNameTooltipProps> = ({
  children,
  resource,
  wrap = true,
  onShowPopover,
  description,
  descriptionMaxLines = 3,
  withFocusTrap,
}) => (
  <div style={{ display: wrap ? 'block' : 'inline-flex' }}>
    <Flex
      flexWrap={{ default: 'nowrap' }}
      gap={{ default: 'gapXs' }}
      alignItems={{ default: 'alignItemsCenter' }}
    >
      <FlexItem>{children}</FlexItem>
      {resource.metadata?.name && (
        <Popover
          position="right"
          aria-label="Resource name and type"
          data-resource-name-popover
          withFocusTrap={withFocusTrap}
          onShow={(): void => {
            if (onShowPopover) {
              onShowPopover();
            }
          }}
          bodyContent={
            <Stack hasGutter>
              <StackItem>
                Resource names and types are used to find your resources in OpenShift.
              </StackItem>
              <StackItem>
                <DescriptionList isCompact isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Resource name</DescriptionListTerm>
                    <DescriptionListDescription>
                      <ClipboardCopy
                        hoverTip="Copy"
                        clickTip="Copied"
                        variant="inline-compact"
                        data-testid="resource-name-text"
                      >
                        {resource.metadata.name}
                      </ClipboardCopy>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Resource type</DescriptionListTerm>
                    <DescriptionListDescription data-testid="resource-kind-text">
                      {resource.kind}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  {description && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Resource description</DescriptionListTerm>
                      <DescriptionListDescription data-testid="resource-description-text">
                        <ExpandableSection
                          variant="truncate"
                          truncateMaxLines={descriptionMaxLines}
                          toggleTextCollapsed="Show more"
                          toggleTextExpanded="Show less"
                        >
                          {description}
                        </ExpandableSection>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                </DescriptionList>
              </StackItem>
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
      )}
    </Flex>
  </div>
);

export default ResourceNameTooltip;
