import * as React from 'react';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import '~/pages/notebookController/NotebookController.scss';

type ResourceNameTooltipProps = {
  resource: K8sResourceCommon;
  children: React.ReactNode;
};

const ResourceNameTooltip: React.FC<ResourceNameTooltipProps> = ({ children, resource }) => (
  <div>
    {children}{' '}
    {resource.metadata?.name && (
      <div style={{ display: 'inline-block' }}>
        <Tooltip
          removeFindDomNode
          position="right"
          content={
            <Stack hasGutter>
              <StackItem>
                Resource names and types are used to find your resources in OpenShift.
              </StackItem>
              <StackItem>
                <DescriptionList isCompact isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Resource name</DescriptionListTerm>
                    <DescriptionListDescription>
                      {resource.metadata.name}
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
          <Button className="odh-notebook-controller__notebook-image-popover-help-icon"  isInline variant="plain" aria-label="More info">
            <OutlinedQuestionCircleIcon />
          </Button>
        </Tooltip>
      </div>
    )}
  </div>
);

export default ResourceNameTooltip;
