import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { InferenceServiceKind } from '~/k8sTypes';

type InternalServicePopoverContentProps = {
  inferenceService: InferenceServiceKind;
  isKserve?: boolean;
};

const InternalServicePopoverContent: React.FC<InternalServicePopoverContentProps> = ({
  inferenceService,
  isKserve,
}) => {
  const isInternalServiceEnabled = !isKserve
    ? inferenceService.status?.components?.predictor
    : inferenceService.status?.address?.url;

  if (!isInternalServiceEnabled) {
    return <>Could not find any internal service enabled</>;
  }

  if (isKserve) {
    return (
      <DescriptionList isCompact>
        <DescriptionListGroup>
          <DescriptionListTerm>route</DescriptionListTerm>
          <DescriptionListDescription>
            {inferenceService.status?.address?.url}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    );
  }

  return (
    <DescriptionList isCompact>
      {Object.entries(isInternalServiceEnabled).map(([route, value]) => (
        <DescriptionListGroup key={route}>
          <DescriptionListTerm>{route}</DescriptionListTerm>
          <DescriptionListDescription>{value}</DescriptionListDescription>
        </DescriptionListGroup>
      ))}
    </DescriptionList>
  );
};

export default InternalServicePopoverContent;
