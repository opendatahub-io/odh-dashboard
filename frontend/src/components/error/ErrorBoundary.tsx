import * as React from 'react';
import { Title } from '@patternfly/react-core';
import ErrorDetails from './ErrorDetails';

type ErrorBoundaryProps = {
  children?: React.ReactNode;
};

type ErrorBoundaryState =
  | { hasError: false }
  | {
      hasError: true;
      error: Error;
      errorInfo: React.ErrorInfo;
    };

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
    // eslint-disable-next-line no-console
    console.error('Caught error:', error, errorInfo);
  }

  render(): React.ReactNode {
    const { children } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      const { error, errorInfo } = this.state;
      return (
        <div className="pf-v5-u-p-lg">
          <Title headingLevel="h1" className="pf-v5-u-mb-lg">
            An error occurred.
          </Title>
          <ErrorDetails
            title={error.name}
            errorMessage={error.message}
            componentStack={errorInfo.componentStack}
            stack={error.stack}
          />
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
