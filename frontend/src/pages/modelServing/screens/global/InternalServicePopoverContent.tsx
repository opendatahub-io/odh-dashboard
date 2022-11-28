import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { InferenceServiceKind } from 'k8sTypes';

type InternalServicePopoverContentProps = {
  inferenceService: InferenceServiceKind;
};

const InternalServicePopoverContent: React.FC<InternalServicePopoverContentProps> = ({
  inferenceService,
}) => {
  const isInternalServiceEnabled = inferenceService.status?.components?.predictor;

  if (!isInternalServiceEnabled) {
    return <>Could not find any internal service enabled</>;
  }

  return (
    <DescriptionList isCompact>
      {Object.keys(isInternalServiceEnabled).map((route) => (
        <DescriptionListGroup key={route}>
          <DescriptionListTerm>{route}</DescriptionListTerm>
          <DescriptionListDescription>{isInternalServiceEnabled[route]}</DescriptionListDescription>
        </DescriptionListGroup>
      ))}
    </DescriptionList>
  );
};

export default InternalServicePopoverContent;
