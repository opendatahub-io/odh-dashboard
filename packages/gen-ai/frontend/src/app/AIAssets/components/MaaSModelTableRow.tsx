import * as React from 'react';
import { Button, ButtonVariant, Label, Popover } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { CheckCircleIcon, ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { TableRowTitleDescription } from 'mod-arch-shared';
import { AIModel, LlamaModel, LlamaStackDistributionModel, MaaSModel } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import { convertMaaSModelToAIModel } from '~/app/utilities/utils';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import MaaSModelTableRowEndpoint from './MaaSModelTableRowEndpoint';

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
          <TableRowTitleDescription
            title={
              <>
                {model.id}
                <Popover aria-label="Models as a Service" bodyContent={<>Models as a Service</>}>
                  <Label
                    style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}
                    color="orange"
                    aria-label="Model as a Service"
                  >
                    MaaS
                  </Label>
                </Popover>
              </>
            }
          />
        </Td>
        <Td dataLabel="Endpoint">
          <MaaSModelTableRowEndpoint model={model} />
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
              onClick={() =>
                navigate(genAiChatPlaygroundRoute(namespace?.name), {
                  state: {
                    model: enabledModel.id,
                  },
                })
              }
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
