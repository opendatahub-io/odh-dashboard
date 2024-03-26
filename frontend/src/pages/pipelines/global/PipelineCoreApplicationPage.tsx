import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import PipelineCoreProjectSelector from '~/pages/pipelines/global/PipelineCoreProjectSelector';
import { PipelineServerTimedOut, usePipelinesAPI } from '~/concepts/pipelines/context';

export type PipelineCoreApplicationPageProps = {
  children: React.ReactNode;
  getRedirectPath: (namespace: string) => string;
  overrideChildPadding?: boolean;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'loaded' | 'empty' | 'emptyStatePage' | 'headerContent' | 'provideChildrenPadding'
>;

const PipelineCoreApplicationPage: React.FC<PipelineCoreApplicationPageProps> = ({
  children,
  getRedirectPath,
  overrideChildPadding,
  ...pageProps
}) => {
  const pipelinesAPi = usePipelinesAPI();

  return (
    <ApplicationsPage
      {...pageProps}
      loaded={!pipelinesAPi.pipelinesServer.initializing}
      empty={!pipelinesAPi.pipelinesServer.installed}
      emptyStatePage={<NoPipelineServer />}
      headerContent={<PipelineCoreProjectSelector getRedirectPath={getRedirectPath} />}
      provideChildrenPadding={!overrideChildPadding}
    >
      {pipelinesAPi.pipelinesServer.timedOut ? <PipelineServerTimedOut /> : children}
    </ApplicationsPage>
  );
};

export default PipelineCoreApplicationPage;
