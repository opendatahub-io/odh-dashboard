import * as React from 'react';
import { ButtonVariant } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import NoPipelineServer from '#~/concepts/pipelines/NoPipelineServer';
import PipelineCoreProjectSelector from '#~/pages/pipelines/global/PipelineCoreProjectSelector';
import { PipelineServerTimedOut, usePipelinesAPI } from '#~/concepts/pipelines/context';
import { getGenericErrorCode } from '#~/api/errorUtils';
import UnauthorizedError from '#~/pages/UnauthorizedError';

export type PipelineCoreApplicationPageProps = {
  children: React.ReactNode;
  getRedirectPath: (namespace: string) => string;
  overrideChildPadding?: boolean;
  overrideTimeout?: boolean;
  /** Custom domain name for 403 error messages (e.g., "pipeline runs", "artifacts") */
  accessDomain?: string;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'loaded' | 'empty' | 'emptyStatePage' | 'headerContent' | 'provideChildrenPadding'
>;

const PipelineCoreApplicationPage: React.FC<PipelineCoreApplicationPageProps> = ({
  children,
  getRedirectPath,
  overrideChildPadding,
  overrideTimeout = false,
  accessDomain = 'pipelines',
  ...pageProps
}) => {
  const { pipelinesServer, pipelineLoadError } = usePipelinesAPI();

  // Handle 403 errors with a specific message
  const loadErrorPage =
    pipelineLoadError && getGenericErrorCode(pipelineLoadError) === 403 ? (
      <UnauthorizedError accessDomain={accessDomain} />
    ) : undefined;

  return (
    <ApplicationsPage
      {...pageProps}
      loaded={!pipelinesServer.initializing}
      loadError={pipelineLoadError}
      loadErrorPage={loadErrorPage}
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
