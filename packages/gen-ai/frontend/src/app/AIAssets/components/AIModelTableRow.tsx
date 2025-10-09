import * as React from 'react';
import { Button, Truncate, Label, ButtonVariant } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { CheckCircleIcon, ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { TableRowTitleDescription, TruncatedText } from 'mod-arch-shared';
import { AIModel, LlamaModel, LlamaStackDistributionModel } from '~/app/types';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import { GenAiContext } from '~/app/context/GenAiContext';
import AIModelsTableRowEndpoint from './AIModelsTableRowEndpoint';
import AIModelsTableRowInfo from './AIModelsTableRowInfo';

type AIModelTableRowProps = {
  lsdStatus: LlamaStackDistributionModel | null;
  model: AIModel;
  models: AIModel[];
  playgroundModels: LlamaModel[];
};

const AIModelTableRow: React.FC<AIModelTableRowProps> = ({
  lsdStatus,
  model,
  models,
  playgroundModels,
}) => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const enabledModel = playgroundModels.find((m) => m.modelId === model.model_id);
  const [isConfigurationModalOpen, setIsConfigurationModalOpen] = React.useState(false);

  return (
    <>
      <Tr>
        <Td dataLabel="Model deployment name">
          <>
            <TableRowTitleDescription title={<AIModelsTableRowInfo model={model} />} />
            {/* The shared TableRowTitleDescription component only accepts a string for the description
         * so we need to use the TruncatedText component to truncate the description
         and take it out of the TableRowTitleDescription component */}
            <TruncatedText maxLines={2} content={model.description} style={{ cursor: 'help' }} />
          </>
        </Td>
        <Td dataLabel="Internal endpoint">
          <AIModelsTableRowEndpoint model={model} />
        </Td>
        <Td dataLabel="External endpoint">
          <AIModelsTableRowEndpoint model={model} isExternal />
        </Td>
        <Td dataLabel="Use Case">
          <Truncate content={model.usecase} />
        </Td>
        <Td dataLabel="Status">
          {model.status === 'Running' ? (
            <Label color="green" icon={<CheckCircleIcon />}>
              Active
            </Label>
          ) : (
            <Label color="red" icon={<ExclamationCircleIcon />}>
              Inactive
            </Label>
          )}
        </Td>
        <Td dataLabel="Playground">
          {enabledModel ? (
            <Button
              variant={ButtonVariant.secondary}
              onClick={() =>
                navigate(genAiChatPlaygroundRoute(namespace?.name), {
                  state: {
                    model: enabledModel.id,
                  },
                })
              }
            >
              Try in playground
            </Button>
          ) : (
            <Button
              variant={ButtonVariant.link}
              icon={<PlusCircleIcon />}
              onClick={() => setIsConfigurationModalOpen(true)}
              isDisabled={model.status !== 'Running'}
            >
              Add to playground
            </Button>
          )}
        </Td>
      </Tr>
      {isConfigurationModalOpen && (
        <ChatbotConfigurationModal
          onClose={() => setIsConfigurationModalOpen(false)}
          lsdStatus={lsdStatus}
          allModels={models}
          existingModels={playgroundModels}
          extraSelectedModels={[model]}
          redirectToPlayground
        />
      )}
    </>
  );
};

export default AIModelTableRow;
