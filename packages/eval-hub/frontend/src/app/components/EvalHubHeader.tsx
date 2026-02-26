import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

const ICON_SIZE = 40;
const ICON_PADDING = 4;

const EvalHubHeader: React.FC<{ title: string }> = ({ title }) => (
  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
    <FlexItem>
      <div
        style={{
          background: 'var(--pf-t--global--color--brand--default)',
          borderRadius: ICON_SIZE / 2,
          padding: ICON_PADDING,
          width: ICON_SIZE,
          height: ICON_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--pf-t--global--icon--color--on-brand--default)',
        }}
      >
        <CubesIcon
          style={{
            width: ICON_SIZE - ICON_PADDING * 2,
            height: ICON_SIZE - ICON_PADDING * 2,
          }}
        />
      </div>
    </FlexItem>
    <FlexItem>{title}</FlexItem>
  </Flex>
);

export default EvalHubHeader;
