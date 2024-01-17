import * as React from 'react';
import {
  Alert,
  Bullseye,
  Flex,
  FlexItem,
  Spinner,
  Stack,
  StackItem,
  Text,
  TextContent,
  Title,
} from '@patternfly/react-core';
import { ProjectSectionID } from './types';

type DetailsSectionProps = {
  id: ProjectSectionID;
  actions?: React.ReactNode[];
  iconSrc: string;
  iconAlt: string;
  title: string;
  description?: string;
  popover?: React.ReactNode;
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
  iconSrc,
  iconAlt,
  children,
  emptyState,
  id,
  isEmpty,
  isLoading,
  loadError,
  title,
  description,
  popover,
  labels,
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
    <Stack hasGutter className="odh-details-section--divide">
      <StackItem>
        <Flex
          direction={{ default: 'column', md: 'row' }}
          gap={{ default: 'gapMd' }}
          alignItems={{ md: 'alignItemsCenter' }}
        >
          <Flex flex={{ default: 'flex_1' }} direction={{ default: 'column' }}>
            <FlexItem>
              <Flex
                direction={{ default: 'row' }}
                gap={{ default: 'gapXs' }}
                alignItems={{ md: 'alignItemsCenter' }}
              >
                <img style={{ width: '32px' }} src={iconSrc} alt={iconAlt} />
                <FlexItem>
                  <Title id={`${id}-title`} headingLevel="h2" size="xl">
                    {title}
                  </Title>
                </FlexItem>
                {popover}
              </Flex>
              <TextContent>{description && <Text component="p">{description}</Text>}</TextContent>
            </FlexItem>
          </Flex>
          <Flex direction={{ default: 'column', md: 'row' }}>
            {actions && <FlexItem>{actions}</FlexItem>}
            {labels && <FlexItem align={{ default: 'alignRight' }}>{labels}</FlexItem>}
          </Flex>
        </Flex>
      </StackItem>
      {renderContent()}
    </Stack>
  );
};

export default DetailsSection;
