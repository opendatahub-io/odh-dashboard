import * as React from 'react';
import {
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Progress,
  ProgressProps,
} from '@patternfly/react-core';
import './ProgressBarWithLabels.scss';

type ProgressBarWithLabelsProps = Omit<ProgressProps, 'ref' | 'measureLocation'> & {
  inUseLabel: React.ReactNode;
  maxValueLabel: number | string;
  textMinWidth?: string;
  contentComponentVariant?: ContentVariants;
};

const ProgressBarWithLabels: React.FC<ProgressBarWithLabelsProps> = ({
  inUseLabel,
  maxValueLabel,
  textMinWidth,
  contentComponentVariant,
  ...props
}) => (
  <Flex alignItems={{ default: 'alignItemsCenter' }}>
    <FlexItem>
      <Content style={{ minWidth: textMinWidth }} component={contentComponentVariant}>
        {inUseLabel}
      </Content>
    </FlexItem>
    <FlexItem grow={{ default: 'grow' }}>
      <Progress measureLocation="none" className="progress-bar" {...props} />
    </FlexItem>
    <FlexItem>
      <Content style={{ minWidth: textMinWidth }} component={contentComponentVariant}>
        {maxValueLabel}
      </Content>
    </FlexItem>
  </Flex>
);

export default ProgressBarWithLabels;
