import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
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
            content={
              <DescriptionList isCompact isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Resource name</DescriptionListTerm>
                  <DescriptionListDescription>{resource.metadata.name}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Resource type</DescriptionListTerm>
                  <DescriptionListDescription>{resource.kind}</DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
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
