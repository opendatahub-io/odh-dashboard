import * as React from 'react';
import { ButtonVariant } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
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
<<<<<<< HEAD
      emptyStatePage={<NoPipelineServer variant={ButtonVariant.primary} />}
      headerContent={<PipelineCoreProjectSelector getRedirectPath={getRedirectPath} />}
=======
      emptyStatePage={<NoPipelineServer />}
      getRedirectPath={getRedirectPath}
>>>>>>> 6a2dbb83 (Update project selector)
      provideChildrenPadding={!overrideChildPadding}
    >
      {pipelinesAPi.pipelinesServer.timedOut ? <PipelineServerTimedOut /> : children}
    </ApplicationsPage>
  );
};

export default PipelineCoreApplicationPage;
