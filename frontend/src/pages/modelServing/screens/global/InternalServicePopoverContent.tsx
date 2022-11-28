import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Stack,
  StackItem,
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
    return (
      <Stack hasGutter>
        <StackItem>Could not find any internal service enabled</StackItem>
      </Stack>
    );
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
