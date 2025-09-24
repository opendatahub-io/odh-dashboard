/* eslint-disable camelcase */
import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  Spinner,
  Tooltip,
  EmptyStateFooter,
  Content,
} from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { CodeIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import ChatbotEmptyState from '~/app/EmptyStates/NoData';
import { deleteLSD, installLSD } from '~/app/services/llamaStackService';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import ChatbotHeader from './ChatbotHeader';
import ChatbotPlayground from './ChatbotPlayground';
import ChatbotConfigurationModal from './components/ChatbotConfigurationModal';

const ChatbotMain: React.FunctionComponent = () => {
  const { lsdStatus, lsdStatusLoaded, lsdStatusError, selectedModel, lastInput, refresh } =
    React.useContext(ChatbotContext);
  const { namespace } = React.useContext(GenAiContext);
  const {
    data: aiModels,
    loaded: aiModelsLoaded,
    error: aiModelsError,
  } = useFetchAIModels(namespace?.name);
  const navigate = useNavigate();

  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = React.useState(false);
  const [configurationModalOpen, setConfigurationModalOpen] = React.useState(false);

  const isViewCodeDisabled = !lastInput || !selectedModel;

  // Get disabled reason for popover
  const getDisabledReason = () => {
    if (!lastInput && !selectedModel) {
      return 'Please input a message and select a model to generate code';
    }
    if (!lastInput) {
      return 'Please input a message to generate code';
    }
    if (!selectedModel) {
      return 'Please select a model to generate code';
    }
    return '';
  };

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
                navigate(`/modelServing/${namespace?.name}`);
              }}
            />
          ) : (
            <ChatbotEmptyState
              title="Enable Playground"
              description="Create a playground to chat with the generative models deployed in this project. Experiment with model output using a simple RAG simulation, custom prompt and MCP servers."
              actionButtonText="Configure playground"
              handleActionButtonClick={() => {
                if (namespace?.name) {
                  installLSD(
                    namespace.name,
                    aiModels.map((model) => model.model_name),
                  )
                    .then(() => {
                      setConfigurationModalOpen(true);
                    })
                    .catch((e) => {
                      // TODO: Figure out how to handle errors here
                      // eslint-disable-next-line no-console
                      console.error('Failed to configure playground', e.message);
                    });
                }
              }}
            />
          )
        }
        loadError={lsdStatusError || aiModelsError}
        headerAction={
          lsdStatus?.phase === 'Ready' &&
          (isViewCodeDisabled ? (
            <Tooltip content={getDisabledReason()}>
              <Button
                variant="secondary"
                aria-label="View generated code (disabled)"
                icon={<CodeIcon />}
                isAriaDisabled={isViewCodeDisabled}
              >
                View Code
              </Button>
            </Tooltip>
          ) : (
            <Button
              variant="secondary"
              aria-label="View generated code"
              icon={<CodeIcon />}
              onClick={() => setIsViewCodeModalOpen(true)}
            >
              View Code
            </Button>
          ))
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
            titleText="Failed to configure playground"
            variant={EmptyStateVariant.lg}
            status="danger"
          >
            <EmptyStateBody>Please delete the playground and try again</EmptyStateBody>
            <EmptyStateFooter>
              <Button
                variant="primary"
                onClick={() => {
                  if (namespace?.name) {
                    deleteLSD(namespace.name, lsdStatus.name).then(refresh);
                  }
                }}
              >
                Delete playground
              </Button>
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
        />
      )}
    </>
  );
};

export { ChatbotMain };
