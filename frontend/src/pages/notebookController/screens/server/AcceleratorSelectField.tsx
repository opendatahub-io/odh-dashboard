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
import { AcceleratorKind } from '~/k8sTypes';
import SimpleDropdownSelect, { SimpleDropdownOption } from '~/components/SimpleDropdownSelect';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { AcceleratorState } from '~/utilities/useAcceleratorState';
import useAcceleratorCounts from './useAcceleratorCounts';

type AcceleratorSelectFieldProps = {
  acceleratorState: AcceleratorState;
  setAcceleratorState: UpdateObjectAtPropAndValue<AcceleratorState>;
  supportedAccelerators?: string[];
  resourceDisplayName?: string;
  infoContent?: string;
};

const AcceleratorSelectField: React.FC<AcceleratorSelectFieldProps> = ({
  acceleratorState,
  setAcceleratorState,
  supportedAccelerators,
  resourceDisplayName = 'image',
  infoContent,
}) => {
  const [detectedAcceleratorInfo] = useAcceleratorCounts();

  const {
    accelerator,
    count: acceleratorCount,
    accelerators,
    useExisting,
    additionalOptions,
  } = acceleratorState;

  const generateAcceleratorCountWarning = (newSize: number) => {
    if (!accelerator) {
      return '';
    }

    const identifier = accelerator?.spec.identifier;

    const detectedAcceleratorCount = Object.entries(detectedAcceleratorInfo.available).find(
      ([id]) => identifier === id,
    )?.[1];

    if (detectedAcceleratorCount === undefined) {
      return `No accelerator detected with the identifier ${identifier}.`;
    } else if (newSize > detectedAcceleratorCount) {
      return `Only ${detectedAcceleratorCount} accelerator${
        detectedAcceleratorCount > 1 ? 's' : ''
      } detected.`;
    }

    return '';
  };

  const acceleratorCountWarning = generateAcceleratorCountWarning(acceleratorCount);

  const isAcceleratorSupported = (accelerator: AcceleratorKind) =>
    supportedAccelerators?.includes(accelerator.spec.identifier);

  const enabledAccelerators = accelerators.filter((ac) => ac.spec.enabled);

  const formatOption = (ac: AcceleratorKind): SimpleDropdownOption => {
    const displayName = `${ac.spec.displayName}${!ac.spec.enabled ? ' (disabled)' : ''}`;

    return {
      key: ac.metadata.name,
      selectedLabel: displayName,
      description: ac.spec.description,
      label: (
        <Split>
          <SplitItem>{displayName}</SplitItem>
          <SplitItem isFilled />
          <SplitItem>
            {isAcceleratorSupported(ac) && (
              <Label color="blue">{`Compatible with ${resourceDisplayName}`}</Label>
            )}
          </SplitItem>
        </Split>
      ),
    };
  };

  const options: SimpleDropdownOption[] = enabledAccelerators
    .sort((a, b) => {
      const aSupported = isAcceleratorSupported(a);
      const bSupported = isAcceleratorSupported(b);
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
  if (accelerator && supportedAccelerators !== undefined) {
    if (supportedAccelerators?.length === 0) {
      acceleratorAlertMessage = {
        title: `The ${resourceDisplayName} you have selected doesn't support the selected accelerator. It is recommended to use a compatible ${resourceDisplayName} for optimal performance.`,
        variant: AlertVariant.info,
      };
    } else if (!isAcceleratorSupported(accelerator)) {
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
    options.push(formatOption(additionalOptions?.useDisabled));
  }

  const onStep = (step: number) => {
    setAcceleratorState('count', Math.max(acceleratorCount + step, 1));
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
          <SimpleDropdownSelect
            isFullWidth
            options={options}
            value={useExisting ? 'use-existing' : accelerator?.metadata.name ?? ''}
            onChange={(key, isPlaceholder) => {
              if (isPlaceholder) {
                // none
                setAcceleratorState('useExisting', false);
                setAcceleratorState('accelerator', undefined);
                setAcceleratorState('count', 0);
              } else if (key === 'use-existing') {
                // use existing settings
                setAcceleratorState('useExisting', true);
                setAcceleratorState('accelerator', undefined);
                setAcceleratorState('count', 0);
              } else {
                // normal flow
                setAcceleratorState('count', 1);
                setAcceleratorState('useExisting', false);
                setAcceleratorState(
                  'accelerator',
                  accelerators.find((ac) => ac.metadata.name === key),
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
      {accelerator && (
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
                    setAcceleratorState('count', Math.max(newSize, 1));
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

export default AcceleratorSelectField;
