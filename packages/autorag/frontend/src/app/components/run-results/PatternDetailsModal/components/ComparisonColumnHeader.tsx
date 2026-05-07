import React from 'react';
import { Button, Content, ContentVariants, Flex, FlexItem, Title } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { formatPatternName } from '~/app/utilities/utils';

type ComparisonColumnHeaderProps = {
  patternName: string;
  rank: number;
  label?: string;
  onChangeClick?: () => void;
  children?: React.ReactNode;
  'data-testid'?: string;
};

const ComparisonColumnHeader: React.FC<ComparisonColumnHeaderProps> = ({
  patternName,
  rank,
  label,
  onChangeClick,
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
    {onChangeClick && (
      <FlexItem>
        <Button
          variant="link"
          icon={<SyncAltIcon />}
          onClick={onChangeClick}
          data-testid="change-comparison-pattern"
        >
          Change
        </Button>
      </FlexItem>
    )}
    {children}
  </Flex>
);

export default ComparisonColumnHeader;
