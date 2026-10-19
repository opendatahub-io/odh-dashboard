import * as React from 'react';
import { Split, SplitItem, Label, Flex, FlexItem } from '@patternfly/react-core';
import { upperFirst } from 'lodash-es';
import { getImageTierColor } from './imageTierUtils';

export type ImageStreamDropdownLabelProps = {
  displayName?: string;
  compatible: boolean;
  isDeprecated: boolean;
  tier: string;
  content?: React.ReactNode | string;
};

export const ImageStreamDropdownLabel: React.FC<ImageStreamDropdownLabelProps> = ({
  displayName,
  compatible,
  isDeprecated,
  tier,
  content,
}) => (
  <Split hasGutter>
    {displayName ? (
      <>
        <SplitItem>{displayName}</SplitItem>
        <SplitItem isFilled />
      </>
    ) : null}
    <SplitItem>
      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Label color={getImageTierColor(tier)}>{upperFirst(tier)}</Label>
        </FlexItem>
        {isDeprecated ? (
          <FlexItem>
            <Label color="yellow">Deprecated</Label>
          </FlexItem>
        ) : null}
        {compatible ? (
          <FlexItem>
            <Label color="blue">{content}</Label>
          </FlexItem>
        ) : null}
      </Flex>
    </SplitItem>
  </Split>
);
