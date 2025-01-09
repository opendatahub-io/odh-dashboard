import * as React from 'react';
import { useParams } from 'react-router-dom';
import { ButtonVariant, Flex, FlexItem } from '@patternfly/react-core';
import {
  t_global_border_color_default as borderColor,
  t_global_spacer_sm as SpacerSm,
} from '@patternfly/react-tokens';
import ApplicationsPage from '~/pages/ApplicationsPage';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import PipelineCoreProjectSelector from '~/pages/pipelines/global/PipelineCoreProjectSelector';
import { PipelineServerTimedOut, usePipelinesAPI } from '~/concepts/pipelines/context';
import ProjectLink from '~/concepts/projects/ProjectLink';

export type PipelineCoreApplicationPageProps = {
  children: React.ReactNode;
  page: string;
  getRedirectPath: (namespace: string) => string;
  showProjectSelector?: boolean;
  overrideChildPadding?: boolean;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'loaded' | 'empty' | 'emptyStatePage' | 'headerContent' | 'provideChildrenPadding'
>;

const PipelineCoreApplicationPage: React.FC<PipelineCoreApplicationPageProps> = ({
  children,
  page,
  getRedirectPath,
  overrideChildPadding,
  showProjectSelector = true,
  breadcrumb,
  ...pageProps
}) => {
  const { pipelinesServer } = usePipelinesAPI();
  const { namespace } = useParams();

  return (
    <ApplicationsPage
      {...pageProps}
      breadcrumb={
        namespace && breadcrumb ? (
          <Flex gap={{ default: 'gapSm' }}>
            <FlexItem>{breadcrumb}</FlexItem>
            <FlexItem
              style={{ borderLeft: `1px solid ${borderColor.var}`, paddingLeft: SpacerSm.var }}
            >
              <ProjectLink namespace={namespace} />
            </FlexItem>
          </Flex>
        ) : (
          breadcrumb
        )
      }
      loaded={!pipelinesServer.initializing}
      empty={!pipelinesServer.installed}
      emptyStatePage={<NoPipelineServer variant={ButtonVariant.primary} />}
      headerContent={
        showProjectSelector ? (
          <PipelineCoreProjectSelector page={page} getRedirectPath={getRedirectPath} />
        ) : null
      }
      provideChildrenPadding={!overrideChildPadding}
    >
      {pipelinesServer.timedOut && pipelinesServer.compatible ? (
        <PipelineServerTimedOut />
      ) : (
        children
      )}
    </ApplicationsPage>
  );
};

export default PipelineCoreApplicationPage;
