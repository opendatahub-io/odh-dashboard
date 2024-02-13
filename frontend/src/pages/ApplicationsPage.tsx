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

type ApplicationsPageProps = {
  title: React.ReactNode;
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
  jobReferenceName?: React.ReactNode;
  loadingContent?: React.ReactNode;
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
  jobReferenceName,
  loadingContent,
}) => {
  const renderHeader = () => (
    <PageSection variant={PageSectionVariants.light}>
      <Stack hasGutter>
        <StackItem>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            flexWrap={{ default: 'nowrap' }}
          >
            <>
              <TextContent>
                <Text component="h1" data-testid="app-page-title">
                  {title}
                </Text>
                {jobReferenceName}
                {description && <Text component="p">{description}</Text>}
              </TextContent>
            </>
            {headerAction}
          </Flex>
        </StackItem>
        {headerContent && <StackItem>{headerContent}</StackItem>}
      </Stack>
    </PageSection>
  );

  const renderContents = () => {
    if (loadError) {
      return (
        <PageSection isFilled>
          <EmptyState variant={EmptyStateVariant.lg} data-id="error-empty-state">
            <EmptyStateHeader
              titleText={
                <>{errorMessage !== undefined ? errorMessage : 'Error loading components'}</>
              }
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
              titleText={<>{emptyMessage !== undefined ? emptyMessage : 'No Components Found'}</>}
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
        <PageSection variant="light" isFilled>
          {children}
        </PageSection>
      );
    }

    return children;
  };

  return (
    <>
      {breadcrumb && <PageBreadcrumb>{breadcrumb}</PageBreadcrumb>}
      {renderHeader()}
      {renderContents()}
    </>
  );
};

export default ApplicationsPage;
