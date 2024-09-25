import React from 'react';
import { ExclamationCircleIcon, QuestionCircleIcon } from '@patternfly/react-icons';
import {
  PageSection,
  PageSectionVariants,
  TextContent,
  Text,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  Spinner,
  EmptyStateBody,
  PageBreadcrumb,
  StackItem,
  Stack,
  EmptyStateHeader,
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
    <PageSection variant={PageSectionVariants.light}>
      <Stack hasGutter>
        {headerContent && <StackItem>{headerContent}</StackItem>}
        <StackItem>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            flexWrap={{ default: 'nowrap' }}
          >
            <TextContent>
              <Text component="h1" data-testid="app-page-title">
                {title}
              </Text>
              <Stack hasGutter>
                {subtext && <StackItem>{subtext}</StackItem>}
                {description && <StackItem>{description}</StackItem>}
              </Stack>
            </TextContent>
            {headerAction}
          </Flex>
        </StackItem>
      </Stack>
    </PageSection>
  );

  const renderContents = () => {
    if (loadError) {
      return (
        <PageSection isFilled>
          <EmptyState variant={EmptyStateVariant.lg} data-id="error-empty-state">
            <EmptyStateHeader
              titleText={errorMessage !== undefined ? errorMessage : 'Error loading components'}
              icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
              headingLevel="h1"
            />
            <EmptyStateBody>{loadError.message}</EmptyStateBody>
          </EmptyState>
        </PageSection>
      );
    }

    if (!loaded) {
      return (
        loadingContent || (
          <PageSection isFilled>
            <EmptyState variant={EmptyStateVariant.lg} data-id="loading-empty-state">
              <Spinner size="xl" />
              <EmptyStateHeader titleText="Loading" headingLevel="h1" />
            </EmptyState>
          </PageSection>
        )
      );
    }

    if (empty) {
      return !emptyStatePage ? (
        <PageSection isFilled>
          <EmptyState variant={EmptyStateVariant.lg} data-id="empty-empty-state">
            <EmptyStateHeader
              titleText={emptyMessage !== undefined ? emptyMessage : 'No Components Found'}
              icon={<EmptyStateIcon icon={QuestionCircleIcon} />}
              headingLevel="h1"
            />
          </EmptyState>
        </PageSection>
      ) : (
        emptyStatePage
      );
    }

    if (provideChildrenPadding) {
      return (
        <PageSection
          variant="light"
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
          variant="light"
          stickyOnBreakpoint={{ default: 'top' }}
          className="pf-v5-u-py-0"
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
      {breadcrumb && <PageBreadcrumb>{breadcrumb}</PageBreadcrumb>}
      {!noHeader && renderHeader()}
      {renderContents()}
    </>
  );
};

export default ApplicationsPage;
