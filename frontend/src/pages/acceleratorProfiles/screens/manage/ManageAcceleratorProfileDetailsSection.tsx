import { FormGroup, Switch, Popover } from '@patternfly/react-core';
import React from 'react';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useSearchParams } from 'react-router-dom';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { AcceleratorProfileFormData } from './types';
import { IdentifierSelectField } from './IdentifierSelectField';

type ManageAcceleratorProfileDetailsSectionProps = {
  state: AcceleratorProfileFormData;
  setState: UpdateObjectAtPropAndValue<AcceleratorProfileFormData>;
};

export const ManageAcceleratorProfileDetailsSection: React.FC<
  ManageAcceleratorProfileDetailsSectionProps
> = ({ state, setState }) => {
  const [searchParams] = useSearchParams();

  const acceleratorIdentifiers = React.useMemo(
    () => searchParams.get('identifiers')?.split(',') ?? [],
    [searchParams],
  );

  return (
    <>
      <FormGroup
        label="Identifier"
        isRequired
        labelHelp={
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
      <FormGroup label="Enabled">
        <Switch
          id="accelerator-enabled"
          isChecked={state.enabled}
          onChange={(_, enabled) => setState('enabled', enabled)}
          aria-label="Enabled"
        />
      </FormGroup>
    </>
  );
};
