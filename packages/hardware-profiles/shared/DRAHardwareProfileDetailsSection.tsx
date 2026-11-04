import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  type DescriptionListProps,
  DescriptionListTerm,
  Label,
  Truncate,
} from '@patternfly/react-core';
import { kindApiVersion } from '@odh-dashboard/k8s-core';
import { ResourceClaimTemplateModel } from '@odh-dashboard/k8s-core/api/models';
import { ResourceNameTooltip } from '@odh-dashboard/ui-core';
import type { DRAHardwareProfileDetails } from './types';

type DRAHardwareProfileDetailsSectionProps = {
  details: DRAHardwareProfileDetails;
} & Pick<DescriptionListProps, 'isHorizontal' | 'horizontalTermWidthModifier'>;

const DRAHardwareProfileDetailsSection: React.FC<DRAHardwareProfileDetailsSectionProps> = ({
  details,
  isHorizontal,
  horizontalTermWidthModifier,
}) => (
  <DescriptionList
    data-testid="hardware-profile-dra-details"
    isHorizontal={isHorizontal}
    horizontalTermWidthModifier={horizontalTermWidthModifier}
  >
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
          withFocusTrap={false}
        >
          <Truncate
            content={details.resourceClaimTemplateName}
            data-testid="hardware-profile-dra-template"
          />
        </ResourceNameTooltip>
      </DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);

export default DRAHardwareProfileDetailsSection;
