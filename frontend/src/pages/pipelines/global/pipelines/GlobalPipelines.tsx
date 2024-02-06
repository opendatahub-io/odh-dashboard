import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  pipelinesPageDescription,
  pipelinesPageTitle,
} from '~/pages/pipelines/global/pipelines/const';
import PipelineServerActions from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineServerActions';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import PipelinesView from '~/pages/pipelines/global/pipelines/PipelinesView';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import PipelineAndVersionContextProvider from '~/concepts/pipelines/content/PipelineAndVersionContext';
import pipelinesIcon from '~/images/UI_icon-Red_Hat-Branch-RGB.svg';

const GlobalPipelines: React.FC = () => {
  const pipelinesAPi = usePipelinesAPI();

  return (
    <PipelineCoreApplicationPage
      title={
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <div
              style={{
                background: 'rgba(87, 82, 209, 0.1)',
                borderRadius: 20,
                padding: 4,
                width: 40,
                height: 40,
              }}
            >
              <img style={{ height: 32 }} src={pipelinesIcon} alt="project" />
            </div>
          </FlexItem>
          <FlexItem>{pipelinesPageTitle}</FlexItem>
        </Flex>
      }
      description={pipelinesPageDescription}
      headerAction={<PipelineServerActions isDisabled={!pipelinesAPi.pipelinesServer.installed} />}
      getRedirectPath={(namespace) => `/pipelines/${namespace}`}
    >
      <EnsureAPIAvailability>
        <PipelineAndVersionContextProvider>
          <PipelinesView />
        </PipelineAndVersionContextProvider>
      </EnsureAPIAvailability>
    </PipelineCoreApplicationPage>
  );
};

export default GlobalPipelines;
