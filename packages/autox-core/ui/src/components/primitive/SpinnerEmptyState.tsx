import * as React from 'react';
import { Flex, FlexItem, Spinner, Title } from '@patternfly/react-core';

interface SpinnerEmptyStateProps {
  title: string;
  description: React.ReactNode;
  /** Optional extra content rendered below the description, e.g. a link. */
  footer?: React.ReactNode;
  spinnerDiameter?: string;
  'data-testid'?: string;
}

/**
 * A generic centered "in progress" state: spinner + title + description +
 * optional footer slot. Carries no domain vocabulary of its own — callers
 * supply all text and any footer content via props.
 */
const SpinnerEmptyState: React.FC<SpinnerEmptyStateProps> = ({
  title,
  description,
  footer,
  spinnerDiameter = '80px',
  'data-testid': testId,
}) => (
  <Flex data-testid={testId} justifyContent={{ default: 'justifyContentCenter' }}>
    <Flex
      direction={{ default: 'column' }}
      gap={{ default: 'gapMd' }}
      alignItems={{ default: 'alignItemsCenter' }}
      style={{ maxWidth: 'var(--pf-t--global--breakpoint--md)', textAlign: 'center' }}
    >
      <FlexItem>
        <Spinner diameter={spinnerDiameter} />
      </FlexItem>
      <FlexItem>
        <Title headingLevel="h2" size="lg">
          {title}
        </Title>
      </FlexItem>
      <FlexItem>{description}</FlexItem>
      {footer ? <FlexItem>{footer}</FlexItem> : null}
    </Flex>
  </Flex>
);

export default SpinnerEmptyState;
