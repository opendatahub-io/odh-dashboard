import * as React from 'react';
import { Split, SplitItem, Label } from '@patternfly/react-core';

export type ImageStreamDropdownLabelProps = {
  displayName: string;
  compatible: boolean;
  content?: React.ReactNode | string;
};

export const ImageStreamDropdownLabel: React.FC<ImageStreamDropdownLabelProps> = ({
  displayName,
  compatible,
  content,
}) => (
  <Split>
    <SplitItem>{displayName}</SplitItem>
    <SplitItem isFilled />
    <SplitItem>{compatible && <Label color="blue">{content}</Label>}</SplitItem>
  </Split>
);
