import React from 'react';
import { Alert, PageSection } from '@patternfly/react-core';

type ErrorBoundaryProps = {
  children?: React.ReactNode;
};

type ErrorBoundaryState =
  | { hasError: false }
  | { hasError: true; error: Error; errorInfo: React.ErrorInfo };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ hasError: true, error, errorInfo });
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <PageSection hasBodyWrapper={false}>
          <Alert variant="danger" isInline title="Something went wrong">
            An unexpected error occurred. Please try again or contact support.
          </Alert>
        </PageSection>
      );
    }
    return this.props.children;
  }
}
