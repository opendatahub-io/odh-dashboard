import * as React from 'react';
import ErrorDetails from './ErrorDetails';
import ErrorFallbackLayout from './ErrorFallbackLayout';
import UpdateState from './UpdateState';

type ErrorBoundaryProps = {
  children?: React.ReactNode;
};

type ErrorBoundaryState =
  | { hasError: false }
  | {
      hasError: true;
      error: Error;
      errorInfo: React.ErrorInfo;
      isUpdateState: boolean;
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
      isUpdateState: error.name === 'ChunkLoadError',
    });
    // eslint-disable-next-line no-console
    console.error('Caught error:', error, errorInfo);
  }

  render(): React.ReactNode {
    const { children } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      const { error, errorInfo, isUpdateState } = this.state;
      if (isUpdateState) {
        return (
          <UpdateState
            onClose={() => this.setState((prevState) => ({ ...prevState, isUpdateState: false }))}
          />
        );
      }
      return (
        <div className="pf-v6-u-p-lg" data-testid="error-boundary">
          <ErrorFallbackLayout onClose={() => this.setState({ hasError: false })}>
            <ErrorDetails
              title={error.name}
              errorMessage={error.message}
              componentStack={errorInfo.componentStack || ''}
              stack={error.stack}
            />
          </ErrorFallbackLayout>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
