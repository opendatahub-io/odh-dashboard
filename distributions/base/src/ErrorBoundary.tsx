import React from 'react';
import { Alert, PageSection } from '@patternfly/react-core';

const normalizeError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }
  try {
    return new Error(String(value));
  } catch {
    return new Error('Unknown error');
  }
};

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

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error: normalizeError(error), errorInfo: { componentStack: '' } };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    this.setState({ hasError: true, error: normalizeError(error), errorInfo });
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { error } = this.state;
      return (
        <PageSection hasBodyWrapper={false}>
          <Alert variant="danger" isInline isExpandable title="Something went wrong">
            <p>An unexpected error occurred while loading this content.</p>
            <p>
              <strong>{error.name}:</strong> {error.message}
            </p>
          </Alert>
        </PageSection>
      );
    }
    return this.props.children;
  }
}
