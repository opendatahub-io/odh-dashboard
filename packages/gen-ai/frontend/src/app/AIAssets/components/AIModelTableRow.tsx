import * as React from 'react';
import { Button, Truncate, Label, ButtonVariant } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InfoCircleIcon,
  PlusCircleIcon,
} from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { TableRowTitleDescription, TruncatedText } from 'mod-arch-shared';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { AIModel, LlamaModel, LlamaStackDistributionModel } from '~/app/types';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import { getSourceLabel, getSourceLabelColor, getModelTypeLabel } from '~/app/utilities/utils';
import { GenAiContext } from '~/app/context/GenAiContext';
import AIModelsTableRowInfo from './AIModelsTableRowInfo';
import EndpointDetailModal from './EndpointDetailModal';

type AIModelTableRowProps = {
  lsdStatus: LlamaStackDistributionModel | null;
  model: AIModel;
  allModels: AIModel[];
  playgroundModels: LlamaModel[];
};

const AIModelTableRow: React.FC<AIModelTableRowProps> = ({
  lsdStatus,
  model,
  allModels,
  playgroundModels,
}) => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const enabledModel = playgroundModels.find((m) => m.modelId === model.model_id);
  const [isConfigurationModalOpen, setIsConfigurationModalOpen] = React.useState(false);
  const [isEndpointModalOpen, setIsEndpointModalOpen] = React.useState(false);
  const sourceLabel = getSourceLabel(model);
  const assetType = model.model_source_type === 'maas' ? 'maas_model' : 'model';

  return (
    <>
      <Tr>
        <Td dataLabel="Model deployment name">
          <TableRowTitleDescription title={<AIModelsTableRowInfo model={model} />} />
          <Truncate
            content={model.description}
            style={{
              fontSize: 'var(--pf-t--global--font--size--xs)',
              color: 'var(--pf-t--global--text--color--subtle)',
              marginTop: 'var(--pf-t--global--spacer--xs)',
              cursor: 'help',
            }}
          />
        </Td>
        <Td dataLabel="Source">
          <Label color={getSourceLabelColor(sourceLabel)} isCompact>
            {sourceLabel}
          </Label>
        </Td>
        <Td dataLabel="Endpoints">
          {model.externalEndpoint || model.internalEndpoint ? (
            <Button
              data-testid="endpoint-view-button"
              variant={ButtonVariant.link}
              onClick={() => setIsEndpointModalOpen(true)}
            >
              View
            </Button>
          ) : (
            <Label
              icon={<InfoCircleIcon />}
              data-testid="endpoint-not-available"
              aria-label="Endpoint not available"
            >
              Not available
            </Label>
          )}
        </Td>
        <Td dataLabel="Model type">
          <Truncate content={getModelTypeLabel(model.model_type)} />
        </Td>
        <Td dataLabel="Use case">
          <TruncatedText maxLines={2} content={model.usecase} />
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
              data-testid="try-playground-button"
              variant={ButtonVariant.secondary}
              onClick={() => {
                fireMiscTrackingEvent('Available Endpoints Playground Launched', {
                  assetType,
                  assetId: model.model_id,
                });
                navigate(genAiChatPlaygroundRoute(namespace?.name), {
                  state: {
                    model: enabledModel.id,
                  },
                });
              }}
              // Embedding models cannot be tried in the chat playground (vector output is not supported)
              isDisabled={model.status !== 'Running' || model.model_type === 'embedding'}
            >
              Try in playground
            </Button>
          ) : (
            <Button
              variant={ButtonVariant.link}
              icon={<PlusCircleIcon />}
              onClick={() => setIsConfigurationModalOpen(true)}
              // Add stays enabled for embedding models (may be used in RAG configurations)
              isDisabled={model.status !== 'Running'}
            >
              Add to playground
            </Button>
          )}
        </Td>
      </Tr>
      {isEndpointModalOpen && (
        <EndpointDetailModal model={model} onClose={() => setIsEndpointModalOpen(false)} />
      )}
      {isConfigurationModalOpen && (
        <ChatbotConfigurationModal
          onClose={() => setIsConfigurationModalOpen(false)}
          lsdStatus={lsdStatus}
          aiModels={allModels}
          existingModels={playgroundModels}
          extraSelectedModels={[model]}
          redirectToPlayground
        />
      )}
    </>
  );
};

export default AIModelTableRow;
