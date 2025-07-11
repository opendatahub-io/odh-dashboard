import * as React from 'react';
import {
  ClipboardCopy,
  ClipboardCopyVariant,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ListItem,
} from '@patternfly/react-core';
import { InferenceServiceKind } from '#~/k8sTypes';

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
          <DescriptionListTerm>Internal (can only be accessed from inside the cluster)</DescriptionListTerm>
          <DescriptionListDescription>
            <ClipboardCopy
              hoverTip="Copy"
              clickTip="Copied"
              variant={ClipboardCopyVariant.inlineCompact}
            >
              {inferenceService.status?.address?.url ?? ''}
            </ClipboardCopy>
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    );
  }

  return (
    <DescriptionList isCompact>
      <DescriptionListTerm>
        Internal (can only be accessed from inside the cluster)
      </DescriptionListTerm>
      {Object.entries(isInternalServiceEnabled)
        .slice(0, 2)
        .map(([route, value]) => (
          <DescriptionListGroup key={route}>
            <DescriptionListTerm>
              <ListItem>{route}</ListItem>
            </DescriptionListTerm>
            <DescriptionListDescription style={{ paddingLeft: 'var(--pf-t--global--spacer--md)' }}>
              <ClipboardCopy
                hoverTip="Copy"
                clickTip="Copied"
                variant={ClipboardCopyVariant.inlineCompact}
              >
                {value}
              </ClipboardCopy>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ))}
    </DescriptionList>
  );
};

export default InternalServicePopoverContent;
