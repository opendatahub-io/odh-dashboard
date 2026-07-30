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
  Content,
  Title,
} from '@patternfly/react-core';
import { ProjectObjectType } from '../../design/types';
import HeaderIcon from '../../design/HeaderIcon';
import './DetailsSection.scss';

export type DetailsSectionProps = {
  id: string;
  actions?: React.ReactNode[];
  objectType?: ProjectObjectType;
  title?: string;
  description?: string;
  popover?: React.ReactNode;
  isLoading: boolean;
  loadError?: Error;
  unauthorizedContent?: React.ReactNode;
  isEmpty: boolean;
  emptyState: React.ReactNode;
  children: React.ReactNode;
  labels?: React.ReactNode[];
  showDivider?: boolean;
};

const DetailsSection: React.FC<DetailsSectionProps> = ({
  actions,
  objectType,
  children,
  emptyState,
  id,
  isEmpty,
  isLoading,
  loadError,
  unauthorizedContent,
  title,
  description,
  popover,
  labels,
  showDivider,
}) => {
  const renderContent = () => {
    if (loadError) {
      if (unauthorizedContent) {
        return unauthorizedContent;
      }
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
    <PageSection hasBodyWrapper={false} aria-label="details-section" id={id}>
      <Stack
        data-testid={`section-${id}`}
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
                    {objectType ? (
                      <FlexItem>
                        <HeaderIcon type={objectType} />
                      </FlexItem>
                    ) : null}
                    {title ? (
                      <FlexItem>
                        <Title id={`${id}-title`} headingLevel="h2" size="xl">
                          {title}
                        </Title>
                      </FlexItem>
                    ) : null}
                    {popover ? <FlexItem>{popover}</FlexItem> : null}
                  </Flex>
                </FlexItem>
                <FlexItem>
                  <Content>{description && <Content component="p">{description}</Content>}</Content>
                </FlexItem>
              </Flex>
              <Flex direction={{ default: 'column', md: 'row' }}>
                {actions && (
                  <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    {actions.map((action, index) => (
                      <FlexItem data-testid="details-section-action" key={index}>
                        {action}
                      </FlexItem>
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
