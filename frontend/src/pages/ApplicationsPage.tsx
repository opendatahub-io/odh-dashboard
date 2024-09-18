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
import ProjectSelectorNavigator from '~/concepts/projects/ProjectSelectorNavigator';

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
  getRedirectPath?: (namespace: string) => string;
  provideChildrenPadding?: boolean;
  removeChildrenTopPadding?: boolean;
  subtext?: React.ReactNode;
  loadingContent?: React.ReactNode;
  noHeader?: boolean;
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
  getRedirectPath,
  provideChildrenPadding,
  removeChildrenTopPadding,
  subtext,
  loadingContent,
  noHeader,
}) => {
  const renderHeader = () => (
    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        {headerContent && <StackItem>{headerContent}</StackItem>}
        <StackItem>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            flexWrap={{ default: 'nowrap' }}
          >
            <Content>
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
      {getRedirectPath ? (
        <PageSection
          stickyOnBreakpoint={{ default: 'top' }}
          className="pf-v6-u-py-0"
          style={{
            borderBottom:
              'var(--pf-v5-global--BorderWidth--sm) solid var(--pf-v5-global--BorderColor--100)',
          }}
        >
          <ProjectSelectorNavigator
            getRedirectPath={getRedirectPath}
            showTitle
            invalidDropdownPlaceholder="Select project"
          />
        </PageSection>
      ) : null}
      {breadcrumb && <PageBreadcrumb hasBodyWrapper={false}>{breadcrumb}</PageBreadcrumb>}
      {!noHeader && renderHeader()}
      {renderContents()}
    </>
  );
};

export default ApplicationsPage;
