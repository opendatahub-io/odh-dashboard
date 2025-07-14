import * as React from 'react';
import { ButtonVariant } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import NoPipelineServer from '#~/concepts/pipelines/NoPipelineServer';
import PipelineCoreProjectSelector from '#~/pages/pipelines/global/PipelineCoreProjectSelector';
import { PipelineServerTimedOut, usePipelinesAPI } from '#~/concepts/pipelines/context';

export type PipelineCoreApplicationPageProps = {
  children: React.ReactNode;
  getRedirectPath: (namespace: string) => string;
  overrideChildPadding?: boolean;
  overrideTimeout?: boolean;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'loaded' | 'empty' | 'emptyStatePage' | 'headerContent' | 'provideChildrenPadding'
>;

const PipelineCoreApplicationPage: React.FC<PipelineCoreApplicationPageProps> = ({
  children,
  getRedirectPath,
  overrideChildPadding,
  overrideTimeout = false,
  ...pageProps
}) => {
  const { pipelinesServer } = usePipelinesAPI();

  return (
    <ApplicationsPage
      {...pageProps}
      loaded={!pipelinesServer.initializing}
      empty={!pipelinesServer.installed}
      emptyStatePage={<NoPipelineServer variant={ButtonVariant.primary} />}
      headerContent={<PipelineCoreProjectSelector getRedirectPath={getRedirectPath} />}
      provideChildrenPadding={!overrideChildPadding}
    >
      {!overrideTimeout && pipelinesServer.timedOut && pipelinesServer.compatible ? (
        <PipelineServerTimedOut />
      ) : (
        children
      )}
    </ApplicationsPage>
  );
};

export default PipelineCoreApplicationPage;
