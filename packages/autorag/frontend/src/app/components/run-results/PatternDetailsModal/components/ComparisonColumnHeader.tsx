import React from 'react';
import { Content, ContentVariants, Flex, FlexItem, Title } from '@patternfly/react-core';
import { formatPatternName } from '~/app/utilities/utils';

type ComparisonColumnHeaderProps = {
  patternName: string;
  rank: number;
  label?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
};

const ComparisonColumnHeader: React.FC<ComparisonColumnHeaderProps> = ({
  patternName,
  rank,
  label,
  children,
  'data-testid': testId,
}) => (
  <Flex
    alignItems={{ default: 'alignItemsCenter' }}
    gap={{ default: 'gapSm' }}
    data-testid={testId}
  >
    <FlexItem>
      <Title headingLevel="h4" size="md">
        {formatPatternName(patternName)} (#{rank})
      </Title>
    </FlexItem>
    {label && (
      <FlexItem>
        <Content component={ContentVariants.small}>({label})</Content>
      </FlexItem>
    )}
    {children}
  </Flex>
);

export default ComparisonColumnHeader;
