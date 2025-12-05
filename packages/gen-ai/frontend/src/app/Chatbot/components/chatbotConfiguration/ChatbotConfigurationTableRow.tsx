import * as React from 'react';
import { Tr, Td } from '@patternfly/react-table';
import { CheckboxTd, ResourceNameTooltip, TableRowTitleDescription } from 'mod-arch-shared';
import { Icon, Label, Popover, Flex, FlexItem } from '@patternfly/react-core';
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
}) => {
  // Sanitize model name for testid: remove all characters except alphanumeric and hyphens
  const sanitizedModelName = model.model_name.replace(/[^a-zA-Z0-9-]/g, '');

  return (
    <Tr>
      <CheckboxTd
        id={model.model_name}
        isChecked={isChecked}
        isDisabled={model.status !== 'Running'}
        onToggle={onToggleCheck}
        data-testid={`${sanitizedModelName}-checkbox`}
      />
      <Td dataLabel="Model deployment name">
        <TableRowTitleDescription
          title={
            <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                {model.isMaaSModel ? (
                  model.display_name
                ) : (
                  <ResourceNameTooltip resource={convertAIModelToK8sResource(model)}>
                    {model.display_name}
                  </ResourceNameTooltip>
                )}
              </FlexItem>
              {model.isMaaSModel && (
                <FlexItem>
                  <Popover aria-label="Models as a Service" bodyContent={<>Models as a Service</>}>
                    <Label color="orange" aria-label="Model as a Service">
                      MaaS
                    </Label>
                  </Popover>
                </FlexItem>
              )}
            </Flex>
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
};

export default ChatbotConfigurationTableRow;
