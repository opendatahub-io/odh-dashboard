import * as React from 'react';
import { Bullseye, Content, ContentVariants, Spinner } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { GenAiContext } from '~/app/context/GenAiContext';
import ModelsEmptyState from '~/app/EmptyStates/NoData';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import AIModelsTable from '~/app/AIAssets/components/AIModelsTable';
import useFetchMaaSModels from '~/app/hooks/useFetchMaaSModels';

const AIAssetsModelsTab: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const { data: playgroundModels } = useFetchLlamaModels();
  const { data: aiModels = [], loaded, error } = useFetchAIModels();
  const { data: maasModels = [] } = useFetchMaaSModels();
  const { data: lsdStatus } = useFetchLSDStatus();
  const hasTrackedAssetCount = React.useRef(false);

  // Track asset count when data is loaded
  React.useEffect(() => {
    if (loaded && !hasTrackedAssetCount.current && aiModels.length > 0) {
      fireMiscTrackingEvent('Asset_Count_On_Page_Load', {
        // eslint-disable-next-line camelcase
        models_count: aiModels.length,
        // eslint-disable-next-line camelcase
        mcp_servers_count: 0, // MCP servers are tracked separately in their own tab
      });
      hasTrackedAssetCount.current = true;
    }
  }, [loaded, aiModels]);

  if (!loaded && !error) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error || aiModels.length === 0) {
    return (
      <ModelsEmptyState
        title="To begin you must deploy a model"
        description={
          <Content
            style={{
              textAlign: 'left',
            }}
          >
            <Content component="p">
              Looks like your project is missing at least one model to use the playground. Follow
              the steps below to deploy a model and get started.
            </Content>
            <Content component={ContentVariants.ol}>
              <Content component={ContentVariants.li}>
                Go to your <b>Model Deployments</b> page
              </Content>
              <Content component={ContentVariants.li}>
                Select <b>&apos;Edit&apos;</b> to update your deployment
              </Content>
              <Content component={ContentVariants.li}>
                Check the box: <b>&apos;Make this deployment available as an AI asset&apos;</b>
              </Content>
            </Content>
          </Content>
        }
        actionButtonText="Go to Deployments"
        handleActionButtonClick={() => {
          navigate(`/ai-hub/deployments/${namespace?.name}`);
        }}
      />
    );
  }

  return (
    <AIModelsTable
      aiModels={aiModels}
      maasModels={maasModels}
      playgroundModels={playgroundModels}
      lsdStatus={lsdStatus}
    />
  );
};

export default AIAssetsModelsTab;
