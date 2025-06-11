import React from 'react';
import { ExclamationCircleIcon, QuestionCircleIcon } from '@patternfly/react-icons';
import {
  PageSection,
  Content,
  EmptyState,
  EmptyStateVariant,
  Spinner,
  EmptyStateBody,
  PageBreadcrumb,
  StackItem,
  Stack,
  Flex,
  FlexItem,
} from '@patternfly/react-core';

type LMEvalResultApplicationPageProps = {
  title?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  loaded: boolean;
  empty: boolean;
  loadError?: Error;
  children?: React.ReactNode;
  emptyMessage?: string;
  headerAction?: React.ReactNode;
  provideChildrenPadding?: boolean;
};

const LMEvalResultApplicationPage: React.FC<LMEvalResultApplicationPageProps> = ({
  title,
  breadcrumb,
  loaded,
  empty,
  loadError,
  children,
  emptyMessage,
  headerAction,
  provideChildrenPadding,
}) => {
  const renderHeader = () => (
    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        <StackItem>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
          >
            <FlexItem flex={{ default: 'flex_1' }}>
              <Content component="h1" data-testid="app-page-title">
                {title}
              </Content>
            </FlexItem>
            {headerAction && <FlexItem>{headerAction}</FlexItem>}
          </Flex>
        </StackItem>
      </Stack>
    </PageSection>
  );

  const renderContents = () => {
    if (loadError) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            headingLevel="h1"
            icon={ExclamationCircleIcon}
            titleText="Error loading evaluation results"
            variant={EmptyStateVariant.lg}
            data-id="error-empty-state"
          >
            <EmptyStateBody data-testid="error-empty-state-body">
              {loadError.message}
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      );
    }

    if (!loaded) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            headingLevel="h1"
            titleText="Loading evaluation results"
            variant={EmptyStateVariant.lg}
            data-id="loading-empty-state"
          >
            <Spinner size="xl" />
          </EmptyState>
        </PageSection>
      );
    }

    if (empty) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            headingLevel="h1"
            icon={QuestionCircleIcon}
            titleText={emptyMessage || 'No evaluation results found'}
            variant={EmptyStateVariant.lg}
            data-id="empty-empty-state"
          />
        </PageSection>
      );
    }

    if (provideChildrenPadding) {
      return <PageSection isFilled>{children}</PageSection>;
    }

    return children;
  };

  return (
    <Flex
      direction={{ default: 'column' }}
      flexWrap={{ default: 'nowrap' }}
      style={{ height: '100%' }}
    >
      <FlexItem>
        {breadcrumb && <PageBreadcrumb hasBodyWrapper={false}>{breadcrumb}</PageBreadcrumb>}
      </FlexItem>
      <FlexItem>{renderHeader()}</FlexItem>
      <FlexItem flex={{ default: 'flex_1' }}>
        <Flex
          direction={{ default: 'column' }}
          style={{ height: '100%' }}
          flexWrap={{ default: 'nowrap' }}
        >
          {renderContents()}
        </Flex>
      </FlexItem>
    </Flex>
  );
};

export default LMEvalResultApplicationPage;
