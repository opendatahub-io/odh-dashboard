import * as React from 'react';
import { Button, ButtonVariant, Label, Truncate } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { CheckCircleIcon, ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { TableRowTitleDescription, TruncatedText } from 'mod-arch-shared';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { AIModel, LlamaModel, LlamaStackDistributionModel } from '~/app/types';
import type { MaaSModel } from '~/odh/extension-points/maas';
import { GenAiContext } from '~/app/context/GenAiContext';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import { convertMaaSModelToAIModel } from '~/app/utilities/utils';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import MaaSModelTableRowEndpoint from './MaaSModelTableRowEndpoint';
import MaaSModelsTableRowInfo from './MaaSModelsTableRowInfo';

type MaaSModelTableRowProps = {
  model: MaaSModel;
  playgroundModels: LlamaModel[];
  lsdStatus: LlamaStackDistributionModel | null;
  aiModels: AIModel[];
  maasModels: MaaSModel[];
};

const MaaSModelTableRow: React.FC<MaaSModelTableRowProps> = ({
  model,
  playgroundModels,
  lsdStatus,
  aiModels,
  maasModels,
}) => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const enabledModel = playgroundModels.find((m) => m.modelId === model.id);
  const [isConfigurationModalOpen, setIsConfigurationModalOpen] = React.useState(false);

  // Convert MaaS model to AIModel format for pre-selection in the modal
  const maasAsAIModel: AIModel = React.useMemo(() => convertMaaSModelToAIModel(model), [model]);

  return (
    <>
      <Tr>
        <Td dataLabel="Model deployment name">
          <>
            <TableRowTitleDescription title={<MaaSModelsTableRowInfo model={model} />} />
            {/* The shared TableRowTitleDescription component only accepts a string for the description
             * so we need to use the TruncatedText component to truncate the description
             * and take it out of the TableRowTitleDescription component */}
            {model.description && (
              <TruncatedText maxLines={2} content={model.description} style={{ cursor: 'help' }} />
            )}
          </>
        </Td>
        <Td dataLabel="External endpoint">
          <MaaSModelTableRowEndpoint model={model} />
        </Td>
        <Td dataLabel="Use case">
          <Truncate content={model.usecase || 'LLM'} />
        </Td>
        <Td dataLabel="Status">
          {model.ready ? (
            <Label
              color="green"
              icon={<CheckCircleIcon aria-label="Active status" />}
              aria-label={`${model.id} status: Active`}
            >
              Active
            </Label>
          ) : (
            <Label
              color="red"
              icon={<ExclamationCircleIcon aria-label="Inactive status" />}
              aria-label={`${model.id} status: Inactive`}
            >
              Inactive
            </Label>
          )}
        </Td>
        <Td dataLabel="Playground">
          {enabledModel ? (
            <Button
              variant={ButtonVariant.secondary}
              onClick={() => {
                fireMiscTrackingEvent('Available Endpoints Playground Launched', {
                  assetType: 'maas_model',
                  assetId: model.id,
                });
                navigate(genAiChatPlaygroundRoute(namespace?.name), {
                  state: {
                    model: enabledModel.id,
                  },
                });
              }}
              isDisabled={!model.ready}
            >
              Try in playground
            </Button>
          ) : (
            <Button
              variant={ButtonVariant.link}
              icon={<PlusCircleIcon />}
              onClick={() => setIsConfigurationModalOpen(true)}
              isDisabled={!model.ready}
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
          aiModels={aiModels}
          maasModels={maasModels}
          existingModels={playgroundModels}
          extraSelectedModels={[maasAsAIModel]}
          redirectToPlayground
        />
      )}
    </>
  );
};

export default MaaSModelTableRow;
