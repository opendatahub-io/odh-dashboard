import * as React from 'react';
import { Button, Split, SplitItem, Title } from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
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
          <Split>
            <SplitItem isFilled>
              <Title headingLevel="h1" className="pf-v5-u-mb-lg">
                An error occurred.
              </Title>
            </SplitItem>
            <SplitItem>
              <Button
                variant="plain"
                aria-label="Close"
                onClick={() => {
                  this.setState({ hasError: false });
                }}
              >
                <TimesIcon />
              </Button>
            </SplitItem>
          </Split>
          <ErrorDetails
            title={error.name}
            errorMessage={error.message}
            componentStack={errorInfo.componentStack || ''}
            stack={error.stack}
          />
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
