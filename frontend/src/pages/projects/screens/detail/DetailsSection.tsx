import * as React from 'react';
import classNames from 'classnames';
import {
  Alert,
  Bullseye,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Text,
  TextContent,
  Title,
} from '@patternfly/react-core';
import { ProjectObjectType } from '~/pages/projects/types';
import HeaderIcon from '~/pages/projects/components/HeaderIcon';
import { ProjectSectionID } from './types';

type DetailsSectionAltProps = {
  id: ProjectSectionID;
  actions?: React.ReactNode[];
  objectType: ProjectObjectType;
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

const DetailsSection: React.FC<DetailsSectionAltProps> = ({
  actions,
  objectType,
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
    <PageSection isFilled aria-label="details-section" variant="light">
      <Stack
        data-testid={id}
        hasGutter
        className={classNames({
          'odh-details-section--divide': !loadError && (isLoading || isEmpty || showDivider),
        })}
      >
        {!isEmpty ? (
          <StackItem>
            <Flex
              direction={{ default: 'column', md: 'row' }}
              gap={{ default: 'gapMd' }}
              alignItems={{ md: 'alignItemsCenter' }}
            >
              <Flex flex={{ default: 'flex_1' }}>
                <FlexItem>
                  <Flex
                    direction={{ default: 'row' }}
                    gap={{ default: 'gapSm' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                  >
                    <HeaderIcon type={objectType} />
                    <FlexItem>
                      <Title id={`${id}-title`} headingLevel="h2" size="xl">
                        {title}
                      </Title>
                    </FlexItem>
                    <FlexItem>{popover}</FlexItem>
                  </Flex>
                </FlexItem>
                <FlexItem>
                  <TextContent>
                    {description && <Text component="p">{description}</Text>}
                  </TextContent>
                </FlexItem>
              </Flex>
              <Flex direction={{ default: 'column', md: 'row' }}>
                {actions && (
                  <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    {actions.map((action, index) => (
                      <FlexItem key={index}>{action}</FlexItem>
                    ))}
                  </Flex>
                )}
                {labels && <FlexItem align={{ default: 'alignRight' }}>{labels}</FlexItem>}
              </Flex>
            </Flex>
          </StackItem>
        ) : null}
        {renderContent()}
      </Stack>
    </PageSection>
  );
};

export default DetailsSection;
