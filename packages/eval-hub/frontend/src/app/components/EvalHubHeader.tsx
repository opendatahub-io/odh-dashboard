import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import EvalHubIcon from './EvalHubIcon';

const ICON_SIZE = 40;

const EvalHubHeader: React.FC<{ title: string }> = ({ title }) => (
  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
    <FlexItem>
      <div
        style={{
          background: '#D0C5F4',
          borderRadius: ICON_SIZE / 2,
          width: ICON_SIZE,
          height: ICON_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1a1a1a',
        }}
      >
        <EvalHubIcon />
      </div>
    </FlexItem>
    <FlexItem>{title}</FlexItem>
  </Flex>
);

export default EvalHubHeader;
