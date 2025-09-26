import * as React from 'react';
import { Button, Icon, Label, LabelGroup, Popover, Flex } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

const CustomServingRuntimeHeaderLabels: React.FC = () => {
  const kServeEnabled = useIsAreaAvailable(SupportedArea.K_SERVE).status;
  const modelMeshEnabled = useIsAreaAvailable(SupportedArea.MODEL_MESH).status;

  if (!kServeEnabled && !modelMeshEnabled) {
    return null;
  }

  return (
    <Flex gap={{ default: 'gapMd' }}>
      <LabelGroup>
        {kServeEnabled && (
          <Label data-testid="single-model-serving-enabled">Single-model serving enabled</Label>
        )}
        {modelMeshEnabled && (
          <Label data-testid="multi-model-serving-enabled">Multi-model serving enabled</Label>
        )}
      </LabelGroup>
      <Popover
        showClose
        bodyContent={
          <>
            You can change which model serving platforms are enabled in the{' '}
            <Button size="sm" isInline variant="link">
              <Link to="/settings/cluster/general">Cluster settings</Link>
            </Button>
            .
          </>
        }
      >
        <Icon>
          <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} aria-label="More info" />
        </Icon>
      </Popover>
    </Flex>
  );
};

export default CustomServingRuntimeHeaderLabels;
