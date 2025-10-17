/* eslint-disable camelcase */
import * as React from 'react';
import { EmptyState, EmptyStateVariant, Spinner, Content } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { useNavigate } from 'react-router-dom';
import {
  fireMiscTrackingEvent,
  fireSimpleTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import ChatbotEmptyState from '~/app/EmptyStates/NoData';
import { GenAiContext } from '~/app/context/GenAiContext';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import DeletePlaygroundModal from '~/app/Chatbot/components/DeletePlaygroundModal';
import ChatbotHeader from './ChatbotHeader';
import ChatbotPlayground from './ChatbotPlayground';
import ChatbotHeaderActions from './ChatbotHeaderActions';

const ChatbotMain: React.FunctionComponent = () => {
  const {
    lsdStatus,
    lsdStatusLoaded,
    lsdStatusError,
    refresh,
    aiModels,
    aiModelsLoaded,
    aiModelsError,
    maasModels,
    maasModelsLoaded,
    maasModelsError,
    models,
  } = React.useContext(ChatbotContext);
  const { namespace } = React.useContext(GenAiContext);

  const navigate = useNavigate();

  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = React.useState(false);
  const [configurationModalOpen, setConfigurationModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  // Check if there are any models available (either AI assets or MaaS models)
  const hasModels = aiModels.length > 0 || maasModels.length > 0;

  return (
    <>
      <ApplicationsPage
        title={<ChatbotHeader />}
        loaded={lsdStatusLoaded && (aiModelsLoaded || maasModelsLoaded)}
        empty={!lsdStatus}
        emptyStatePage={
          !hasModels ? (
            <ChatbotEmptyState
              title="No available model deployments"
              description={
                <Content
                  style={{
                    textAlign: 'left',
                  }}
                >
                  <Content component="p">
                    Model deployments must be added as AI asset endpoints to be available for
                    testing in this model playground.
                  </Content>
                  <Content component="p">To enable a deployment:</Content>
                  <Content component="ol">
                    <Content component="li">
                      Deploy a new model or edit an existing deployment.
                    </Content>
                    <Content component="li">
                      In the deployment configuration, check the <b>Add as AI asset endpoint</b> box
                    </Content>
                  </Content>
                </Content>
              }
              actionButtonText={
                <>
                  Go to <b>Model deployments</b>
                </>
              }
              handleActionButtonClick={() => {
                navigate(`/ai-hub/deployments/${namespace?.name}`);
              }}
            />
          ) : (
            <ChatbotEmptyState
              title="Create your playground"
              description="Create a playground to interact with and test available generative models in this project."
              actionButtonText="Create playground"
              handleActionButtonClick={() => {
                setConfigurationModalOpen(true);
                fireMiscTrackingEvent('Playground Setup Initiated', {
                  source: 'Playground',
                });
              }}
            />
          )
        }
        loadError={lsdStatusError || (aiModelsError && maasModelsError)}
        headerAction={
          <ChatbotHeaderActions
            onViewCode={() => {
              setIsViewCodeModalOpen(true);
              fireSimpleTrackingEvent('Playground View Code Selected');
            }}
            onConfigurePlayground={() => setConfigurationModalOpen(true)}
            onDeletePlayground={() => setDeleteModalOpen(true)}
          />
        }
      >
        {lsdStatus?.phase === 'Ready' ? (
          <ChatbotPlayground
            isViewCodeModalOpen={isViewCodeModalOpen}
            setIsViewCodeModalOpen={setIsViewCodeModalOpen}
          />
        ) : lsdStatus?.phase === 'Failed' ? (
          <EmptyState
            headingLevel="h4"
            titleText="Playground creation failed"
            variant={EmptyStateVariant.lg}
            status="danger"
          />
        ) : (
          <EmptyState headingLevel="h4" titleText="Creating playground" icon={Spinner} />
        )}
      </ApplicationsPage>
      {configurationModalOpen && (
        <ChatbotConfigurationModal
          onClose={() => {
            setConfigurationModalOpen(false);
            refresh();
          }}
          aiModels={aiModels}
          lsdStatus={lsdStatus}
          existingModels={models}
          maasModels={maasModels}
        />
      )}
      {deleteModalOpen && (
        <DeletePlaygroundModal
          onCancel={() => {
            setDeleteModalOpen(false);
          }}
        />
      )}
    </>
  );
};

export { ChatbotMain };
