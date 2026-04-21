import React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import AutoragIcon from '~/app/images/icons/AutoragIcon';
import './AutoragHeader.scss';

const AutoragHeader: React.FC = () => (
  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
    <FlexItem>
      <div className="autorag-header__icon-container" data-testid="autorag-header-icon-container">
        <AutoragIcon className="autorag-header__icon" data-testid="autorag-header-icon" />
      </div>
    </FlexItem>
    <FlexItem>AutoRAG</FlexItem>
  </Flex>
);

export default AutoragHeader;
