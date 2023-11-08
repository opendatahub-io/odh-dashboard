import {
  FormSection,
  Stack,
  StackItem,
  FormGroup,
  TextInput,
  TextArea,
  Switch,
  Popover,
} from '@patternfly/react-core';
import React from 'react';
import { HelpIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { AcceleratorKind } from '~/k8sTypes';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { ManageAcceleratorSectionTitles } from './const';
import { ManageAcceleratorSectionID } from './types';

type ManageAcceleratorProfileDetailsSectionProps = {
  state: AcceleratorKind['spec'];
  setState: UpdateObjectAtPropAndValue<AcceleratorKind['spec']>;
};

export const ManageAcceleratorProfileDetailsSection = ({
  state,
  setState,
}: ManageAcceleratorProfileDetailsSectionProps) => (
  <FormSection
    id={ManageAcceleratorSectionID.DETAILS}
    aria-label={ManageAcceleratorSectionTitles[ManageAcceleratorSectionID.DETAILS]}
    title={ManageAcceleratorSectionTitles[ManageAcceleratorSectionID.DETAILS]}
  >
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Name" isRequired>
          <TextInput
            isRequired
            value={state.displayName}
            id="accelerator-name"
            name="accelerator-name"
            onChange={(name) => setState('displayName', name)}
            aria-label="accelerator-name"
            data-testid="accelerator-name-input"
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup
          label="Identifier"
          isRequired
          labelIcon={
            <Popover
              removeFindDomNode
              bodyContent="An identifier is a unique string that names a specific hardware accelerator resource."
            >
              <DashboardPopupIconButton
                icon={<HelpIcon />}
                aria-label="More info for identifier field"
              />
            </Popover>
          }
        >
          <TextInput
            isRequired
            value={state.identifier}
            id="accelerator-identifier"
            name="accelerator-identifier"
            onChange={(identifier) => setState('identifier', identifier)}
            placeholder="Example, nvidia.com/gpu"
            aria-label="accelerator-identifier"
            data-testid="accelerator-identifier-input"
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup label="Description">
          <TextArea
            resizeOrientation="vertical"
            id="accelerator-description"
            name="accelerator-description"
            value={state.description}
            onChange={(description) => setState('description', description)}
            aria-label="accelerator-description"
            data-testid="accelerator-description-input"
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup label="Enabled">
          <Switch
            id="accelerator-enabled"
            isChecked={state.enabled}
            onChange={(enabled) => setState('enabled', enabled)}
            aria-label="accelerator-enabled"
          />
        </FormGroup>
      </StackItem>
    </Stack>
  </FormSection>
);
