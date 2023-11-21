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
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useSearchParams } from 'react-router-dom';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { AcceleratorKind } from '~/k8sTypes';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { ManageAcceleratorSectionTitles } from './const';
import { ManageAcceleratorSectionID } from './types';
import { IdentifierSelectField } from './IdentifierSelectField';

type ManageAcceleratorProfileDetailsSectionProps = {
  state: AcceleratorKind['spec'];
  setState: UpdateObjectAtPropAndValue<AcceleratorKind['spec']>;
};

export const ManageAcceleratorProfileDetailsSection = ({
  state,
  setState,
}: ManageAcceleratorProfileDetailsSectionProps) => {
  const [searchParams] = useSearchParams();

  const acceleratorIdentifiers = React.useMemo(
    () => searchParams.get('identifiers')?.split(',') ?? [],
    [searchParams],
  );

  return (
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
              onChange={(_, name) => setState('displayName', name)}
              aria-label="Name"
              data-testid="accelerator-name-input"
            />
          </FormGroup>
        </StackItem>
        <StackItem>
          <FormGroup
            label="Identifier"
            isRequired
            labelIcon={
              <Popover bodyContent="An identifier is a unique string that names a specific hardware accelerator resource.">
                <DashboardPopupIconButton
                  icon={<OutlinedQuestionCircleIcon />}
                  aria-label="More info for identifier field"
                />
              </Popover>
            }
          >
            <IdentifierSelectField
              value={state.identifier}
              onChange={(identifier) => setState('identifier', identifier)}
              identifierOptions={acceleratorIdentifiers}
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
              onChange={(_, description) => setState('description', description)}
              aria-label="Description"
              data-testid="accelerator-description-input"
            />
          </FormGroup>
        </StackItem>
        <StackItem>
          <FormGroup label="Enabled">
            <Switch
              id="accelerator-enabled"
              isChecked={state.enabled}
              onChange={(_, enabled) => setState('enabled', enabled)}
              aria-label="Enabled"
            />
          </FormGroup>
        </StackItem>
      </Stack>
    </FormSection>
  );
};
