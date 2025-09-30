import * as React from 'react';
import { Button, Truncate, Label, ButtonVariant } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { CheckCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { ResourceNameTooltip, TableRowTitleDescription, TruncatedText } from 'mod-arch-shared';
import { AIModel, LlamaModel } from '~/app/types';
import { convertAIModelToK8sResource } from '~/app/utilities/utils';
import AIModelsTableRowEndpoint from './AIModelsTableRowEndpoint';

type AIModelTableRowProps = {
  // TODO: add the LSD status and all models to the AIModelTableRow
  model: AIModel;
  // models: AIModel[];
  playgroundModels: LlamaModel[];
  onTryInPlayground: (model: AIModel) => void;
};

const AIModelTableRow: React.FC<AIModelTableRowProps> = ({
  model,
  // models,
  playgroundModels,
  onTryInPlayground,
}) => {
  const playgroundModelIds = new Set(playgroundModels.map((m) => m.id));
  const isPlaygroundModel = playgroundModelIds.has(model.model_name);

  return (
    <Tr>
      <Td dataLabel="Model deployment name">
        <>
          <TableRowTitleDescription
            title={
              <ResourceNameTooltip resource={convertAIModelToK8sResource(model)} wrap>
                {model.display_name}
              </ResourceNameTooltip>
            }
          />
          {/* The shared TableRowTitleDescription component only accepts a string for the description
         * so we need to use the TruncatedText component to truncate the description
         and take it out of the TableRowTitleDescription component */}
          <TruncatedText maxLines={2} content={model.description} />
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
        <Label color="green" icon={<CheckCircleIcon />}>
          Active
        </Label>
      </Td>
      <Td dataLabel="Playground">
        {isPlaygroundModel ? (
          <Button variant={ButtonVariant.secondary} onClick={() => onTryInPlayground(model)}>
            Try in playground
          </Button>
        ) : (
          <Button variant={ButtonVariant.link} icon={<PlusCircleIcon />} isDisabled>
            Add to playground
          </Button>
        )}
      </Td>
    </Tr>
    // TODO: add the ChatbotConfigurationModal component here
    // {isConfigurationModalOpen && <ChatbotConfigurationModal
    //   lsdStatus={lsdStatus}
    //   allModels={models}
    //   existingModels={playgroundModels}
    //   extraSelectedModels={[model]}
    //   redirectToPlayground
    // />}
  );
};

export default AIModelTableRow;
