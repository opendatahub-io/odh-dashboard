import * as React from 'react';
import classNames from 'classnames';
import {
  Alert,
  Bullseye,
  Flex,
  FlexItem,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ProjectSectionID } from './types';

type DetailsSectionProps = {
  id: ProjectSectionID;
  actions?: React.ReactNode[];
  title: string;
  isLoading: boolean;
  loadError?: Error;
  isEmpty: boolean;
  emptyState: React.ReactNode;
  children: React.ReactNode;
  labels?: React.ReactNode[];
  showDivider?: boolean;
};

const DetailsSection: React.FC<DetailsSectionProps> = ({
  actions,
  children,
  emptyState,
  id,
  isEmpty,
  isLoading,
  loadError,
  title,
  labels,
  showDivider,
}) => {
  const renderContent = () => {
    if (loadError) {
      return (
        <Alert variant="danger" isInline title="Loading error">
          {loadError.message}
        </Alert>
      );
    }

    if (isLoading) {
      return (
        <Bullseye style={{ minHeight: 150 }}>
          <Spinner />
        </Bullseye>
      );
    }

    if (isEmpty) {
      return emptyState;
    }

    return children;
  };

  return (
    <Stack
      hasGutter
      className={classNames({
        'odh-details-section--divide': !loadError && (isLoading || isEmpty || showDivider),
      })}
    >
      <StackItem>
        <Flex>
          <FlexItem>
            <Title id={`${id}-title`} headingLevel="h2" size="xl">
              {title}
            </Title>
          </FlexItem>
          {actions && <FlexItem>{actions}</FlexItem>}
          {labels && <FlexItem align={{ default: 'alignRight' }}>{labels}</FlexItem>}
        </Flex>
      </StackItem>
      <StackItem>{renderContent()}</StackItem>
    </Stack>
  );
};

export default DetailsSection;
