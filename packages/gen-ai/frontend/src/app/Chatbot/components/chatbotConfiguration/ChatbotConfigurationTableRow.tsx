import * as React from 'react';
import { Tr, Td } from '@patternfly/react-table';
import { CheckboxTd, ResourceNameTooltip, TableRowTitleDescription } from 'mod-arch-shared';
import { Icon } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { AIModel } from '~/app/types';
import { convertAIModelToK8sResource } from '~/app/utilities/utils';

type ChatbotConfigurationTableRowProps = {
  model: AIModel;
  isChecked: boolean;
  onToggleCheck: () => void;
};

const ChatbotConfigurationTableRow: React.FC<ChatbotConfigurationTableRowProps> = ({
  model,
  isChecked,
  onToggleCheck,
}) => (
  <Tr>
    <CheckboxTd id={model.model_name} isChecked={isChecked} onToggle={onToggleCheck} />
    <Td dataLabel="Model deployment name">
      <TableRowTitleDescription
        title={
          <ResourceNameTooltip resource={convertAIModelToK8sResource(model)}>
            {model.display_name}
          </ResourceNameTooltip>
        }
        description={model.description}
        descriptionAsMarkdown
      />
    </Td>
    <Td dataLabel="Status">
      {/* TODO: use status when available */}
      <Icon status="success" size="md">
        <CheckCircleIcon />
      </Icon>
    </Td>
    <Td dataLabel="Use case">{model.usecase}</Td>
  </Tr>
);

export default ChatbotConfigurationTableRow;
