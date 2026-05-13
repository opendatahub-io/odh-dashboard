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
    console.error('Caught error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { error } = this.state;
      return (
        <PageSection hasBodyWrapper={false}>
          <Alert variant="danger" isInline title={error.name}>
            {error.message}
          </Alert>
        </PageSection>
      );
    }
    return this.props.children;
  }
}
