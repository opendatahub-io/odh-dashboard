import * as React from 'react';
import { Tr, Td } from '@patternfly/react-table';
import { CheckboxTd, ResourceNameTooltip, TableRowTitleDescription } from 'mod-arch-shared';
import { Icon } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
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
    <CheckboxTd
      id={model.model_name}
      isChecked={isChecked}
      isDisabled={model.status !== 'Running'}
      onToggle={onToggleCheck}
    />
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
      <Icon status={model.status === 'Running' ? 'success' : 'danger'} size="md">
        {model.status === 'Running' ? <CheckCircleIcon /> : <ExclamationCircleIcon />}
      </Icon>
    </Td>
    <Td dataLabel="Use case">{model.usecase}</Td>
  </Tr>
);

export default ChatbotConfigurationTableRow;
