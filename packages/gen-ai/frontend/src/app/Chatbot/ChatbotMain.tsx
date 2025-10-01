/* eslint-disable camelcase */
import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  Spinner,
  EmptyStateFooter,
  Content,
  EmptyStateActions,
} from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { useLocation, useNavigate } from 'react-router-dom';
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
    setSelectedModel,
    refresh,
    aiModels,
    aiModelsLoaded,
    aiModelsError,
    models,
  } = React.useContext(ChatbotContext);
  const { namespace } = React.useContext(GenAiContext);

  const navigate = useNavigate();

  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = React.useState(false);
  const [configurationModalOpen, setConfigurationModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const location = useLocation();
  const selectedAAModel = location.state?.model;

  React.useEffect(() => {
    if (selectedAAModel) {
      setSelectedModel(selectedAAModel);
    }
  }, [selectedAAModel, setSelectedModel]);

  return (
    <>
      <ApplicationsPage
        title={<ChatbotHeader />}
        loaded={lsdStatusLoaded && aiModelsLoaded}
        empty={!lsdStatus}
        emptyStatePage={
          aiModels.length === 0 ? (
            <ChatbotEmptyState
              title="You need at least one model "
              description={
                <Content
                  style={{
                    textAlign: 'left',
                  }}
                >
                  <Content component="p">
                    Looks like your project is missing at least one model to use the playground.
                    Follow the steps below to deploy make a model available.
                  </Content>
                  <Content component="ol">
                    <Content component="li">
                      Go to your <b>Model Deployments</b> page and identify a LLM model
                    </Content>
                    <Content component="li">
                      {' '}
                      Select <b>&#39;Edit&#39;</b> to update your deployment
                    </Content>
                    <Content component="li">
                      Check the box: <b>&#39;Make this deployment available as an AI asset&#39;</b>
                    </Content>
                  </Content>
                </Content>
              }
              actionButtonText="Go to Model Deployments"
              handleActionButtonClick={() => {
                navigate(`/ai-hub/deployments/${namespace?.name}`);
              }}
            />
          ) : (
            <ChatbotEmptyState
              title="Enable Playground"
              description="Create a playground to chat with the generative models deployed in this project. Experiment with model output using a simple RAG simulation, custom prompt and MCP servers."
              actionButtonText="Configure playground"
              handleActionButtonClick={() => {
                setConfigurationModalOpen(true);
              }}
            />
          )
        }
        loadError={lsdStatusError || aiModelsError}
        headerAction={
          <ChatbotHeaderActions
            onViewCode={() => setIsViewCodeModalOpen(true)}
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
            titleText="Playground setup failed"
            variant={EmptyStateVariant.lg}
            status="danger"
          >
            <EmptyStateBody>
              There was an issue with one or more of the models added to your playground
              configuration.You can update the configuration to change your model selection and try
              again, or delete the playground.
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfigurationModalOpen(true);
                  }}
                >
                  Update configuration
                </Button>
              </EmptyStateActions>
              <EmptyStateActions>
                <Button
                  variant="link"
                  onClick={() => {
                    setDeleteModalOpen(true);
                  }}
                >
                  Delete playground
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        ) : (
          <EmptyState headingLevel="h4" titleText="Configuring playground" icon={Spinner}>
            <EmptyStateBody>
              Please wait while we add models and configure the playground
            </EmptyStateBody>
          </EmptyState>
        )}
      </ApplicationsPage>
      {configurationModalOpen && (
        <ChatbotConfigurationModal
          onClose={() => {
            setConfigurationModalOpen(false);
            refresh();
          }}
          allModels={aiModels}
          lsdStatus={lsdStatus}
          existingModels={models}
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
