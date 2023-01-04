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
  Title,
  EmptyStateBody,
  Split,
  SplitItem,
  PageBreadcrumb,
} from '@patternfly/react-core';

type ApplicationsPageProps = {
  title: string;
  breadcrumb?: React.ReactNode;
  description: React.ReactNode;
  loaded: boolean;
  empty: boolean;
  loadError?: Error;
  children?: React.ReactNode;
  errorMessage?: string;
  emptyMessage?: string;
  emptyStatePage?: React.ReactNode;
  headerAction?: React.ReactNode;
  provideChildrenPadding?: boolean;
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
  provideChildrenPadding,
}) => {
  const renderHeader = () => {
    return (
      <PageSection variant={PageSectionVariants.light}>
        <Split>
          <SplitItem isFilled>
            <TextContent>
              <Text component="h1">{title}</Text>
              <Text component="p">{description}</Text>
            </TextContent>
          </SplitItem>
          {headerAction && <SplitItem>{headerAction}</SplitItem>}
        </Split>
      </PageSection>
    );
  };

  const renderContents = () => {
    if (loadError) {
      return (
        <PageSection isFilled>
          <EmptyState variant={EmptyStateVariant.large} data-id="error-empty-state">
            <EmptyStateIcon icon={ExclamationCircleIcon} />
            <Title headingLevel="h4" size="lg">
              {errorMessage !== undefined ? errorMessage : 'Error loading components'}
            </Title>
            <EmptyStateBody>{loadError.message}</EmptyStateBody>
          </EmptyState>
        </PageSection>
      );
    }

    if (!loaded) {
      return (
        <PageSection isFilled>
          <EmptyState variant={EmptyStateVariant.large} data-id="loading-empty-state">
            <Spinner size="xl" />
            <Title headingLevel="h4" size="lg">
              Loading
            </Title>
          </EmptyState>
        </PageSection>
      );
    }

    if (empty) {
      return !emptyStatePage ? (
        <PageSection isFilled>
          <EmptyState variant={EmptyStateVariant.large} data-id="empty-empty-state">
            <EmptyStateIcon icon={QuestionCircleIcon} />
            <Title headingLevel="h4" size="lg">
              {emptyMessage !== undefined ? emptyMessage : 'No Components Found'}
            </Title>
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
