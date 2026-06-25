import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';

type CompoundExpandCountCellProps = {
  count: number;
};

const CompoundExpandCountCell: React.FC<CompoundExpandCountCellProps> = ({ count }) => (
  <Flex className="pf-v6-u-w-100 pf-v6-u-py-md">
    <FlexItem>{count}</FlexItem>
  </Flex>
);

export default CompoundExpandCountCell;
