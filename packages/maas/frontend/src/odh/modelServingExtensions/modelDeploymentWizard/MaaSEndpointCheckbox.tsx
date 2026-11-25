import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  GridItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
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
 * Keeps a subscribed-users tracking session alive for the whole wizard while this field is
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

const audienceOptions = [
  {
    key: 'project-members',
    title: 'Project members',
    description: 'Available within the UI to users with access to this project.',
    isMaaS: false,
  },
  {
    key: 'subscribed-users',
    title: 'Subscribed users',
    description:
      'Available as a service (MaaS) to users with an admin-assigned subscription and authorization policy.',
    isMaaS: true,
  },
];

const MaaSField: React.FC<MaaSFieldProps> = ({ id, value, onChange, isDisabled }) => {
  const groupId = React.useId();

  return (
    <Grid hasGutter span={12} md={6} role="radiogroup" aria-label="Users">
      {audienceOptions.map(({ key, title, description, isMaaS }) => {
        const radioId = `${groupId}-${key}`;
        const titleId = `${radioId}-title`;
        const descriptionId = `${radioId}-description`;

        return (
          <GridItem key={key}>
            <Card
              isSelectable
              isSelected={Boolean(value?.isChecked) === isMaaS}
              isDisabled={isDisabled}
              isFullHeight
              data-testid={`${key}-card`}
            >
              <CardHeader
                selectableActions={{
                  selectableActionId: radioId,
                  selectableActionAriaLabelledby: titleId,
                  name: groupId,
                  variant: 'single',
                  hasNoOffset: true,
                  onChange: () => onChange({ isChecked: isMaaS }),
                  selectableActionProps: {
                    'aria-describedby': descriptionId,
                    'data-testid': isMaaS ? id : 'project-members-radio',
                  },
                }}
              >
                <CardTitle id={titleId}>{title}</CardTitle>
              </CardHeader>
              <CardBody id={descriptionId}>{description}</CardBody>
            </Card>
          </GridItem>
        );
      })}
    </Grid>
  );
};

export type MaaSFieldType = WizardField<MaaSFieldValue, null, MaaSTrackingDependencies>;

export const MaaSEndpointFieldWizardField: MaaSFieldType = {
  id: 'maas/save-as-maas-checkbox',
  parentId: 'model-users',
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
        overrides.modelAvailability = {
          isDisabled: true,
          forceSaveAsAiAsset: true,
          isMaaSSubscriptionSelected: true,
        };
        overrides.tokenAuthentication = {
          isDisabled: true,
          disabledHelperText:
            'Token authentication does not apply to models published for subscribed users. Access is managed with API keys instead. Manage API keys in Gen AI Studio.',
        };
        overrides['llmd-serving/gateway'] = {
          isDisabled: true,
          selections: [MAAS_DEFAULT_GATEWAY],
          // Clear Project-members hiding so the locked MaaS gateway chip/warning can show
          hiddenOptions: undefined,
          disabledTooltip:
            'Models available as a service (MaaS) are automatically routed through the maas-default-gateway | openshift-ingress gateway.',
          labelHelpPopover: {
            content: (
              <Stack hasGutter>
                <StackItem>
                  Select the gateway through which users can access model deployments.
                </StackItem>
                <StackItem>
                  Models available as a service (<strong>MaaS</strong>) are automatically routed
                  through the <strong>maas-default-gateway | openshift-ingress</strong> gateway.
                </StackItem>
              </Stack>
            ),
          },
        };
      } else {
        overrides.modelAvailability = {
          isDisabled: false,
          forceSaveAsAiAsset: false,
          isMaaSSubscriptionSelected: false,
        };
        overrides['llmd-serving/gateway'] = {
          hiddenOptions: [MAAS_DEFAULT_GATEWAY],
          disabledTooltip: undefined,
          labelHelpPopover: undefined,
          labelOverrides: undefined,
        };
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
