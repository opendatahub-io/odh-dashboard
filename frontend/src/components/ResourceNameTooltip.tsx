import * as React from 'react';
import {
  ClipboardCopy,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import '~/pages/notebookController/NotebookController.scss';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';

type ResourceNameTooltipProps = {
  resource: K8sResourceCommon;
  children: React.ReactNode;
};

const ResourceNameTooltip: React.FC<ResourceNameTooltipProps> = ({ children, resource }) => (
  <div>
    {children}{' '}
    {resource.metadata?.name && (
      <div style={{ display: 'inline-block' }}>
        <Popover
          position="right"
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
                      <ClipboardCopy hoverTip="Copy" clickTip="Copied" variant="inline-compact">
                        {resource.metadata.name}
                      </ClipboardCopy>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Resource type</DescriptionListTerm>
                    <DescriptionListDescription>{resource.kind}</DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </StackItem>
            </Stack>
          }
        >
          <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} aria-label="More info" />
        </Popover>
      </div>
    )}
  </div>
);

export default ResourceNameTooltip;
