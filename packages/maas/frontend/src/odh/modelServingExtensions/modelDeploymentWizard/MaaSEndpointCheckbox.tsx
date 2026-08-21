import React from 'react';
import { Checkbox, Flex, FlexItem, Stack, StackItem } from '@patternfly/react-core';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import type {
  WizardField,
  WizardFormData,
  WizardStateOverrides,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import { isLLMInferenceServiceActive } from '@odh-dashboard/llmd-serving/formUtils';
import { ModelDeploymentMode } from '~/app/types/event-tracking';
import { MAAS_DEFAULT_GATEWAY } from './maasDeploymentTransformer';
import {
  endMaaSPublishTrackingSession,
  isDeploymentWizardPath,
  startMaaSPublishTrackingSession,
  updateMaaSPublishTrackingSession,
} from './maasPublishTracking';

export type MaaSFieldValue = {
  isChecked: boolean;
};

export const maasFieldSchema = z.object({
  isChecked: z.boolean(),
});

const setMaaSFieldData = (value: MaaSFieldValue): MaaSFieldValue => value;
const getInitialMaaSFieldData = (value?: MaaSFieldValue): MaaSFieldValue =>
  value ?? { isChecked: false };

const isMaaSFieldValue = (value: unknown): value is MaaSFieldValue =>
  value != null &&
  typeof value === 'object' &&
  'isChecked' in value &&
  typeof value.isChecked === 'boolean';

type MaaSTrackingDependencies = {
  addedAsMaas: boolean;
};

const resolveMaaSTrackingDependencies = (
  formData: WizardFormData['state'],
): MaaSTrackingDependencies => {
  const raw: unknown = formData['maas/save-as-maas-checkbox'];
  return { addedAsMaas: isMaaSFieldValue(raw) ? raw.isChecked : false };
};

/**
 * Keeps a publish-tracking session alive for the whole wizard while this field is
 * active (not only while the Advanced settings step is mounted). On wizard exit
 * without submit, fires cancel.
 */
const useMaaSPublishTrackingSession = (
  dependencies?: MaaSTrackingDependencies,
): { data: null; loaded: true } => {
  const location = useLocation();
  const isEditing = Boolean(
    location.state?.existingDeployment || location.state?.initialData?.isEditing,
  );
  const mode = isEditing ? ModelDeploymentMode.EDIT : ModelDeploymentMode.CREATE;
  const addedAsMaas = dependencies?.addedAsMaas ?? false;

  React.useEffect(() => {
    startMaaSPublishTrackingSession(mode);
  }, [mode]);

  React.useEffect(() => {
    updateMaaSPublishTrackingSession(addedAsMaas);
  }, [addedAsMaas]);

  React.useEffect(
    () => () => {
      endMaaSPublishTrackingSession(!isDeploymentWizardPath(window.location.pathname));
    },
    [],
  );

  return { data: null, loaded: true };
};

type MaaSFieldProps = {
  id: string;
  value?: MaaSFieldValue;
  onChange: (value: MaaSFieldValue) => void;
  isDisabled?: boolean;
};

const MaaSField: React.FC<MaaSFieldProps> = ({ id, value, onChange, isDisabled }) => {
  const handleCheckboxChange = (_: React.FormEvent<HTMLInputElement>, checked: boolean): void => {
    onChange({ ...value, isChecked: checked });
  };

  return (
    <StackItem>
      <Stack hasGutter>
        <Checkbox
          id={id}
          data-testid={id}
          label={
            <>
              <div className="pf-v6-c-form__label-text">Publish as MaaS</div>
              <Flex>
                <FlexItem>
                  Publishing as MaaS makes the model deployment endpoint accessible to others as a
                  service through a gateway API.
                </FlexItem>
              </Flex>
            </>
          }
          isChecked={value?.isChecked}
          isDisabled={isDisabled}
          onChange={handleCheckboxChange}
        />
      </Stack>
    </StackItem>
  );
};

export type MaaSFieldType = WizardField<MaaSFieldValue, null, MaaSTrackingDependencies>;

export const MaaSEndpointFieldWizardField: MaaSFieldType = {
  id: 'maas/save-as-maas-checkbox',
  parentId: 'model-playground-availability',
  step: 'advancedOptions',
  type: 'addition',
  isActive: isLLMInferenceServiceActive,
  reducerFunctions: {
    setFieldData: setMaaSFieldData,
    getInitialFieldData: getInitialMaaSFieldData,
    validationSchema: maasFieldSchema,
    resolveDependencies: resolveMaaSTrackingDependencies,
    getFieldOverrides: (fieldValue) => {
      const overrides: WizardStateOverrides = {};
      if (fieldValue.isChecked) {
        overrides.tokenAuthentication = { isDisabled: true };
        overrides['llmd-serving/gateway'] = { isDisabled: true, selection: MAAS_DEFAULT_GATEWAY };
      } else {
        overrides['llmd-serving/gateway'] = { hiddenOptions: [MAAS_DEFAULT_GATEWAY] };
      }
      return overrides;
    },
  },
  component: MaaSField,
  externalDataHook: useMaaSPublishTrackingSession,
  getReviewSections: (value) => [
    {
      title: 'Advanced settings',
      items: [
        {
          key: 'maas-endpoint-enabled',
          label: 'MaaS endpoint',
          value: () => (value.isChecked ? 'Yes' : 'No'),
        },
      ],
    },
  ],
};
