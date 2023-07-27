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
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
    // eslint-disable-next-line no-console
    console.error('Caught error:', error, errorInfo);
  }

  render() {
    const { children } = this.props;

    if (this.state.hasError) {
      return (
        <div className="pf-u-p-lg">
          <Title headingLevel="h1" className="pf-u-mb-lg">
            An error occurred.
          </Title>
          <ErrorDetails
            title={this.state.error.name}
            errorMessage={this.state.error.message}
            componentStack={this.state.errorInfo.componentStack}
            stack={this.state.error.stack}
          />
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
