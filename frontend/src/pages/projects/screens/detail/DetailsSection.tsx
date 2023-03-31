import * as React from 'react';
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
        <Bullseye>
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
    <Stack hasGutter>
      <StackItem>
        <Flex>
          <FlexItem>
            <Title id={`${id}-title`} headingLevel="h2" size="xl">
              {title}
            </Title>
          </FlexItem>
          {actions && <FlexItem>{actions}</FlexItem>}
        </Flex>
      </StackItem>
      <StackItem>{renderContent()}</StackItem>
    </Stack>
  );
};

export default DetailsSection;
