import * as React from 'react';
import {
  Alert,
  AlertVariant,
  FormGroup,
  InputGroup,
  Label,
  NumberInput,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Popover,
  Icon,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { isHTMLInputElement } from '~/utilities/utils';
import { AcceleratorProfileKind } from '~/k8sTypes';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { AcceleratorProfileState } from '~/utilities/useAcceleratorProfileState';
import useDetectedAccelerators from './useDetectedAccelerators';

type AcceleratorProfileSelectFieldProps = {
  acceleratorProfileState: AcceleratorProfileState;
  setAcceleratorProfileState: UpdateObjectAtPropAndValue<AcceleratorProfileState>;
  supportedAcceleratorProfiles?: string[];
  resourceDisplayName?: string;
  infoContent?: string;
};

const AcceleratorProfileSelectField: React.FC<AcceleratorProfileSelectFieldProps> = ({
  acceleratorProfileState,
  setAcceleratorProfileState,
  supportedAcceleratorProfiles,
  resourceDisplayName = 'image',
  infoContent,
}) => {
  const [detectedAccelerators] = useDetectedAccelerators();

  const {
    acceleratorProfile,
    count: acceleratorCount,
    acceleratorProfiles,
    useExisting,
    additionalOptions,
  } = acceleratorProfileState;

  const generateAcceleratorCountWarning = (newSize: number) => {
    if (!acceleratorProfile) {
      return '';
    }

    const { identifier } = acceleratorProfile.spec;

    const detectedAcceleratorCount = Object.entries(detectedAccelerators.available).find(
      ([id]) => identifier === id,
    )?.[1];

    if (detectedAcceleratorCount === undefined) {
      return `No accelerator detected with the identifier ${identifier}.`;
    }
    if (newSize > detectedAcceleratorCount) {
      return `Only ${detectedAcceleratorCount} accelerator${
        detectedAcceleratorCount > 1 ? 's' : ''
      } detected.`;
    }

    return '';
  };

  const acceleratorCountWarning = generateAcceleratorCountWarning(acceleratorCount);

  const isAcceleratorProfileSupported = (cr: AcceleratorProfileKind) =>
    supportedAcceleratorProfiles?.includes(cr.spec.identifier);

  const enabledAcceleratorProfiles = acceleratorProfiles.filter((ac) => ac.spec.enabled);

  const formatOption = (cr: AcceleratorProfileKind): SimpleSelectOption => {
    const displayName = `${cr.spec.displayName}${!cr.spec.enabled ? ' (disabled)' : ''}`;

    return {
      key: cr.metadata.name,
      label: displayName,
      description: cr.spec.description,
      dropdownLabel: (
        <Split>
          <SplitItem>{displayName}</SplitItem>
          <SplitItem isFilled />
          <SplitItem>
            {isAcceleratorProfileSupported(cr) && (
              <Label color="blue">{`Compatible with ${resourceDisplayName}`}</Label>
            )}
          </SplitItem>
        </Split>
      ),
    };
  };

  const options: SimpleSelectOption[] = enabledAcceleratorProfiles
    .toSorted((a, b) => {
      const aSupported = isAcceleratorProfileSupported(a);
      const bSupported = isAcceleratorProfileSupported(b);
      if (aSupported && !bSupported) {
        return -1;
      }
      if (!aSupported && bSupported) {
        return 1;
      }
      return 0;
    })
    .map((ac) => formatOption(ac));

  let acceleratorAlertMessage: { title: string; variant: AlertVariant } | null = null;
  if (acceleratorProfile && supportedAcceleratorProfiles !== undefined) {
    if (supportedAcceleratorProfiles.length === 0) {
      acceleratorAlertMessage = {
        title: `The ${resourceDisplayName} you have selected doesn't support the selected accelerator. It is recommended to use a compatible ${resourceDisplayName} for optimal performance.`,
        variant: AlertVariant.info,
      };
    } else if (!isAcceleratorProfileSupported(acceleratorProfile)) {
      acceleratorAlertMessage = {
        title: `The ${resourceDisplayName} you have selected is not compatible with the selected accelerator`,
        variant: AlertVariant.warning,
      };
    }
  }

  // add none option
  options.push({
    key: '',
    label: 'None',
    isPlaceholder: true,
  });

  if (additionalOptions?.useExisting) {
    options.push({
      key: 'use-existing',
      label: 'Existing settings',
      description: 'Use the existing accelerator settings from the notebook server',
    });
  } else if (additionalOptions?.useDisabled) {
    options.push(formatOption(additionalOptions.useDisabled));
  }

  const onStep = (step: number) => {
    setAcceleratorProfileState('count', Math.max(acceleratorCount + step, 1));
  };

  // if there is more than a none option, show the dropdown
  if (options.length === 1) {
    return null;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup
          label="Accelerator"
          fieldId="modal-notebook-accelerator"
          labelIcon={
            infoContent ? (
              <Popover bodyContent={<div>{infoContent}</div>}>
                <Icon aria-label="Accelerator info" role="button">
                  <OutlinedQuestionCircleIcon />
                </Icon>
              </Popover>
            ) : undefined
          }
        >
          <SimpleSelect
            isFullWidth
            options={options}
            value={useExisting ? 'use-existing' : acceleratorProfile?.metadata.name ?? ''}
            onChange={(key, isPlaceholder) => {
              if (isPlaceholder) {
                // none
                setAcceleratorProfileState('useExisting', false);
                setAcceleratorProfileState('acceleratorProfile', undefined);
                setAcceleratorProfileState('count', 0);
              } else if (key === 'use-existing') {
                // use existing settings
                setAcceleratorProfileState('useExisting', true);
                setAcceleratorProfileState('acceleratorProfile', undefined);
                setAcceleratorProfileState('count', 0);
              } else {
                // normal flow
                setAcceleratorProfileState('count', 1);
                setAcceleratorProfileState('useExisting', false);
                setAcceleratorProfileState(
                  'acceleratorProfile',
                  acceleratorProfiles.find((ac) => ac.metadata.name === key),
                );
              }
            }}
          />
        </FormGroup>
      </StackItem>
      {acceleratorAlertMessage && (
        <StackItem>
          <Alert
            isInline
            isPlain
            variant={acceleratorAlertMessage.variant}
            title={acceleratorAlertMessage.title}
          />
        </StackItem>
      )}
      {acceleratorProfile && (
        <StackItem>
          <FormGroup label="Number of accelerators" fieldId="number-of-accelerators">
            <InputGroup>
              <NumberInput
                inputAriaLabel="Number of accelerators"
                id="number-of-accelerators"
                name="number-of-accelerators"
                value={acceleratorCount}
                validated={acceleratorCountWarning ? 'warning' : 'default'}
                min={1}
                onPlus={() => onStep(1)}
                onMinus={() => onStep(-1)}
                onChange={(event) => {
                  if (isHTMLInputElement(event.target)) {
                    const newSize = Number(event.target.value);
                    setAcceleratorProfileState('count', Math.max(newSize, 1));
                  }
                }}
              />
            </InputGroup>
          </FormGroup>
        </StackItem>
      )}
      {acceleratorCountWarning && (
        <StackItem>
          <Alert isInline isPlain variant="warning" title={acceleratorCountWarning} />
        </StackItem>
      )}
    </Stack>
  );
};

export default AcceleratorProfileSelectField;
