import * as React from 'react';
import { Split, SplitItem, Label, Flex, FlexItem } from '@patternfly/react-core';
import { upperFirst } from 'lodash-es';
import { getImageTierColor } from './imageTierUtils';

export type ImageStreamDropdownLabelProps = {
  displayName: string;
  compatible: boolean;
  tier: string;
  content?: React.ReactNode | string;
};

export const ImageStreamDropdownLabel: React.FC<ImageStreamDropdownLabelProps> = ({
  displayName,
  compatible,
  tier,
  content,
}) => (
  <Split hasGutter>
    <SplitItem>{displayName}</SplitItem>
    <SplitItem isFilled />
    <SplitItem>
      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Label color={getImageTierColor(tier)}>{upperFirst(tier)}</Label>
        </FlexItem>
        {compatible ? (
          <FlexItem>
            <Label color="blue">{content}</Label>
          </FlexItem>
        ) : null}
      </Flex>
    </SplitItem>
  </Split>
);
