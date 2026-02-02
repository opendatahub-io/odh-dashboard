import * as React from 'react';
import {
  ClipboardCopy,
  Content,
  StackItem,
  Stack,
  Popover,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { MaaSModel } from '~/app/types';

type MaaSModelsTableRowInfoProps = {
  model: MaaSModel;
};

const MaaSModelsTableRowInfo: React.FC<MaaSModelsTableRowInfoProps> = ({ model }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Use display_name if available, otherwise fall back to id
  const displayName = model.display_name || model.id;

  return (
    <Flex gap={{ default: 'gapXs' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>{displayName}</FlexItem>
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
                data-testid="clipboard-copy-maas-model-id"
                hoverTip="Copy model ID"
                clickTip="Model ID copied"
                aria-label="Copy model ID"
                onCopy={() => {
                  fireMiscTrackingEvent('Available Endpoints Model Id Copied', {
                    assetType: 'maas_model',
                    assetId: model.id,
                  });
                }}
              >
                {model.id}
              </ClipboardCopy>
            </StackItem>
          </Stack>
        }
      >
        <DashboardPopupIconButton
          data-testid="maas-model-id-icon-button"
          icon={<OutlinedQuestionCircleIcon />}
          aria-label="More info"
          style={{ paddingTop: 0, paddingBottom: 0 }}
          onClick={() => setIsOpen(!isOpen)}
        />
      </Popover>
      <FlexItem>
        <Popover aria-label="Models as a Service" bodyContent={<>Models as a Service</>}>
          <Label color="orange" aria-label="Model as a Service">
            MaaS
          </Label>
        </Popover>
      </FlexItem>
    </Flex>
  );
};

export default MaaSModelsTableRowInfo;
