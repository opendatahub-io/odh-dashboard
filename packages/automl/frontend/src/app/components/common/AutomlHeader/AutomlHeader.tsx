import React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import AutomlIcon from '~/app/images/icons/AutomlIcon';
import './AutomlHeader.scss';

const AutomlHeader: React.FC = () => (
  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
    <FlexItem>
      <div className="automl-header__icon-container" data-testid="automl-header-icon-container">
        <AutomlIcon className="automl-header__icon" data-testid="automl-header-icon" />
      </div>
    </FlexItem>
    <FlexItem>AutoML</FlexItem>
  </Flex>
);

export default AutomlHeader;
