import React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import AutoragIcon from '~/app/images/icons/AutoragIcon';
import './AutoragHeader.css';

const ICON_SIZE = 40;
const ICON_PADDING = 4;
const AUTORAG_ICON_BACKGROUND_COLOR = 'var(--autorag-header-icon-bg)';

const INNER_ICON_SIZE = ICON_SIZE - ICON_PADDING * 2;

const containerStyle: React.CSSProperties = {
  background: AUTORAG_ICON_BACKGROUND_COLOR,
  borderRadius: ICON_SIZE / 2,
  padding: ICON_PADDING,
  width: ICON_SIZE,
  height: ICON_SIZE,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const iconStyle: React.CSSProperties = {
  width: INNER_ICON_SIZE,
  height: INNER_ICON_SIZE,
};

const AutoragHeader: React.FC = () => (
  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
    <FlexItem>
      <div style={containerStyle}>
        <AutoragIcon style={iconStyle} />
      </div>
    </FlexItem>
    <FlexItem>AutoRAG</FlexItem>
  </Flex>
);

export default AutoragHeader;
