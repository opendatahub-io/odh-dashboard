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
} from '@patternfly/react-core';
import { is503Error, is403Error, isConnectionError } from '~/app/api/dataRegistry';
import ServiceUnavailableError from './errors/ServiceUnavailableError';
import AccessDeniedError from './errors/AccessDeniedError';
import ConnectionError from './errors/ConnectionError';

type ApplicationsPageProps = {
  title?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  description?: React.ReactNode;
  loaded: boolean;
  empty: boolean;
  loadError?: Error;
  children?: React.ReactNode;
  errorMessage?: string;
  emptyMessage?: string;
  emptyStatePage?: React.ReactNode;
  headerAction?: React.ReactNode;
  headerContent?: React.ReactNode;
  provideChildrenPadding?: boolean;
  removeChildrenTopPadding?: boolean;
  subtext?: React.ReactNode;
  loadingContent?: React.ReactNode;
  noHeader?: boolean;
  onRetry?: () => void;
};

const ApplicationsPage: React.FC<ApplicationsPageProps> = ({
  title,
  breadcrumb,
  description,
  loaded,
  empty,
  loadError,
  children,
  errorMessage,
  emptyMessage,
  emptyStatePage,
  headerAction,
  headerContent,
  provideChildrenPadding,
  removeChildrenTopPadding,
  subtext,
  loadingContent,
  noHeader,
  onRetry,
}) => {
  const renderHeader = () => (
    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        <StackItem>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            flexWrap={{ default: 'nowrap' }}
          >
            <Content className="pf-m-full-width">
              <Content component="h1" data-testid="app-page-title">
                {title}
              </Content>
              <Stack hasGutter>
                {subtext && <StackItem>{subtext}</StackItem>}
                {description && <StackItem>{description}</StackItem>}
              </Stack>
            </Content>
            {headerAction}
          </Flex>
        </StackItem>
        {headerContent && <StackItem>{headerContent}</StackItem>}
      </Stack>
    </PageSection>
  );

  const renderContents = () => {
    if (loadError) {
      if (is503Error(loadError)) {
        return (
          <PageSection hasBodyWrapper={false} isFilled>
            <ServiceUnavailableError onRetry={onRetry} />
          </PageSection>
        );
      }
      if (is403Error(loadError)) {
        return (
          <PageSection hasBodyWrapper={false} isFilled>
            <AccessDeniedError />
          </PageSection>
        );
      }
      if (isConnectionError(loadError)) {
        return (
          <PageSection hasBodyWrapper={false} isFilled>
            <ConnectionError onRetry={onRetry} />
          </PageSection>
        );
      }
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            headingLevel="h1"
            icon={ExclamationCircleIcon}
            titleText={errorMessage !== undefined ? errorMessage : 'Error loading components'}
            variant={EmptyStateVariant.lg}
            data-id="error-empty-state"
          >
            <EmptyStateBody>{loadError.message}</EmptyStateBody>
          </EmptyState>
        </PageSection>
      );
    }

    if (!loaded) {
      return (
        loadingContent || (
          <PageSection hasBodyWrapper={false} isFilled>
            <EmptyState
              headingLevel="h1"
              titleText="Loading"
              variant={EmptyStateVariant.lg}
              data-id="loading-empty-state"
            >
              <Spinner size="xl" />
            </EmptyState>
          </PageSection>
        )
      );
    }

    if (empty) {
      return !emptyStatePage ? (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            headingLevel="h1"
            icon={QuestionCircleIcon}
            titleText={emptyMessage !== undefined ? emptyMessage : 'No Components Found'}
            variant={EmptyStateVariant.lg}
            data-id="empty-empty-state"
          />
        </PageSection>
      ) : (
        emptyStatePage
      );
    }

    if (provideChildrenPadding) {
      return (
        <PageSection
          hasBodyWrapper={false}
          isFilled
          style={removeChildrenTopPadding ? { paddingTop: 0 } : undefined}
        >
          {children}
        </PageSection>
      );
    }

    return children;
  };

  return (
    <>
      {breadcrumb && <PageBreadcrumb hasBodyWrapper={false}>{breadcrumb}</PageBreadcrumb>}
      {!noHeader && renderHeader()}
      {renderContents()}
    </>
  );
};

export default ApplicationsPage;
