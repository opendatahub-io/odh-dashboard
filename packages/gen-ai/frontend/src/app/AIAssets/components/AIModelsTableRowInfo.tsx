import * as React from 'react';
import {
  ClipboardCopy,
  Content,
  StackItem,
  Stack,
  Popover,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { AIModel } from '~/app/types';

type AIModelsTableRowInfoProps = {
  model: AIModel;
};

const AIModelsTableRowInfo: React.FC<AIModelsTableRowInfoProps> = ({ model }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Flex gap={{ default: 'gapXs' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>{model.display_name}</FlexItem>
      <Popover
        position="right"
        isVisible={isOpen}
        onHidden={() => setIsOpen(false)}
        bodyContent={
          <Stack hasGutter>
            <StackItem>
              The model ID is a unique identifier required to locate and access this model.
            </StackItem>
            <StackItem>
              <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
                Model ID
              </Content>
              <ClipboardCopy
                data-testid="clipboard-copy-model-id"
                hoverTip="Copy model ID"
                clickTip="Model ID copied"
                aria-label="Copy model ID"
                onCopy={() => {
                  fireMiscTrackingEvent('Available Endpoints Model Id Copied', {});
                }}
              >
                {model.model_id}
              </ClipboardCopy>
            </StackItem>
          </Stack>
        }
      >
        <DashboardPopupIconButton
          data-testid="model-id-icon-button"
          icon={<OutlinedQuestionCircleIcon />}
          aria-label="More info"
          style={{ paddingTop: 0, paddingBottom: 0 }}
          onClick={() => setIsOpen(!isOpen)}
        />
      </Popover>
    </Flex>
  );
};

export default AIModelsTableRowInfo;
