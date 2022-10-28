import * as React from 'react';
import {
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

type ResourceNameTooltipProps = {
  resource: K8sResourceCommon;
};

const ResourceNameTooltip: React.FC<ResourceNameTooltipProps> = ({ children, resource }) => {
  return (
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
            <OutlinedQuestionCircleIcon />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default ResourceNameTooltip;
