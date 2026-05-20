import React from 'react';
import { loadRemote } from '@module-federation/runtime';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import type { EmbeddableChatbotPlaygroundProps } from '@odh-dashboard/plugin-core/types';

const EmbeddableChatbotPlayground = React.lazy(() =>
  loadRemote<{ default: React.ComponentType<EmbeddableChatbotPlaygroundProps> }>(
    'genAi/EmbeddableChatbotPlayground',
  ).then((mod) => {
    if (!mod) {
      throw new Error('Gen AI module loaded but EmbeddableChatbotPlayground export is missing');
    }
    return mod;
  }),
);

type PlaygroundErrorBoundaryState = {
  hasError: boolean;
};

class PlaygroundErrorBoundary extends React.Component<
  React.PropsWithChildren,
  PlaygroundErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): PlaygroundErrorBoundaryState {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Bullseye>
          <EmptyState
            headingLevel="h2"
            icon={ExclamationCircleIcon}
            titleText="Playground unavailable"
            variant={EmptyStateVariant.sm}
            status="danger"
          >
            <EmptyStateBody>
              The playground component could not be loaded. The Gen AI module may not be available
              in this environment.
            </EmptyStateBody>
          </EmptyState>
        </Bullseye>
      );
    }
    return this.props.children;
  }
}

type EmbeddedPlaygroundProps = EmbeddableChatbotPlaygroundProps;

const EmbeddedPlayground: React.FC<EmbeddedPlaygroundProps> = (props) => (
  <PlaygroundErrorBoundary>
    <React.Suspense
      fallback={
        <Bullseye>
          <Spinner />
        </Bullseye>
      }
    >
      <EmbeddableChatbotPlayground {...props} />
    </React.Suspense>
  </PlaygroundErrorBoundary>
);

export default EmbeddedPlayground;
