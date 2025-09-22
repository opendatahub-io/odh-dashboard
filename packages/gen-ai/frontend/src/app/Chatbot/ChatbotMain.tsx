/* eslint-disable camelcase */
import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  Spinner,
  Tooltip,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { CodeIcon } from '@patternfly/react-icons';
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
                  .catch(() => {
                    // TODO: Figure out how to handle errors here
                  });
              }
            }}
          />
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
          <Bullseye>
            <Spinner size="lg" />
          </Bullseye>
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
