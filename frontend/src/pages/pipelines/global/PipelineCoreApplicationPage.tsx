import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import PipelineCoreProjectSelector from '~/pages/pipelines/global/PipelineCoreProjectSelector';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type PipelineCoreApplicationPageProps = {
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
      emptyStatePage={<NoPipelineServer variant="primary" />}
      headerContent={<PipelineCoreProjectSelector getRedirectPath={getRedirectPath} />}
      provideChildrenPadding={!overrideChildPadding}
    >
      {children}
    </ApplicationsPage>
  );
};

export default PipelineCoreApplicationPage;
