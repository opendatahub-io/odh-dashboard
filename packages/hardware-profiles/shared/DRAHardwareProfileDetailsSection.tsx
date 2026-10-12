import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Truncate,
} from '@patternfly/react-core';
import { kindApiVersion } from '@odh-dashboard/k8s-core';
import { ResourceClaimTemplateModel } from '@odh-dashboard/k8s-core/api/models';
import { ResourceNameTooltip } from '@odh-dashboard/ui-core';
import type { DRAHardwareProfileDetails } from './types';

const MAX_TEMPLATE_NAME_LENGTH = 30;

type DRAHardwareProfileDetailsSectionProps = {
  details: DRAHardwareProfileDetails;
};

const DRAHardwareProfileDetailsSection: React.FC<DRAHardwareProfileDetailsSectionProps> = ({
  details,
}) => (
  <DescriptionList data-testid="hardware-profile-dra-details">
    <DescriptionListGroup>
      <DescriptionListTerm>
        Claim template{' '}
        <Label color="orange" variant="outline" isCompact>
          Tech Preview
        </Label>
      </DescriptionListTerm>
      <DescriptionListDescription>
        <ResourceNameTooltip
          resource={{
            apiVersion: kindApiVersion(ResourceClaimTemplateModel),
            kind: ResourceClaimTemplateModel.kind,
            metadata: { name: details.resourceClaimTemplateName },
          }}
          description={details.description}
        >
          {details.resourceClaimTemplateName.length > MAX_TEMPLATE_NAME_LENGTH ? (
            <Truncate
              content={details.resourceClaimTemplateName}
              maxCharsDisplayed={MAX_TEMPLATE_NAME_LENGTH}
              data-testid="hardware-profile-dra-template"
            />
          ) : (
            <div className="pf-v6-u-text-break-word" data-testid="hardware-profile-dra-template">
              {details.resourceClaimTemplateName}
            </div>
          )}
        </ResourceNameTooltip>
      </DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);

export default DRAHardwareProfileDetailsSection;
