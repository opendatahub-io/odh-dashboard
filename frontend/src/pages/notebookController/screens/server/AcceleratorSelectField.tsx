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
} from '@patternfly/react-core';
import { isHTMLInputElement } from '~/utilities/utils';
import { AcceleratorKind } from '~/k8sTypes';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import useAccelerators from './useAccelerators';
import useAcceleratorCounts from './useAcceleratorCounts';

type AcceleratorSelectFieldProps = {
  accelerator?: AcceleratorKind;
  setAccelerator: (accelerator?: AcceleratorKind) => void;
  acceleratorCount?: number;
  setAcceleratorCount: (size: number) => void;
  supportedAccelerators?: string[];
  supportedText?: string;
};

const AcceleratorSelectField: React.FC<AcceleratorSelectFieldProps> = ({
  accelerator,
  setAccelerator,
  acceleratorCount = 0,
  setAcceleratorCount,
  supportedAccelerators,
  supportedText,
}) => {
  const [accelerators, loaded, loadError] = useAccelerators();
  const [detectedAcceleratorInfo] = useAcceleratorCounts();

  const validateAcceleratorCount = React.useCallback(
    (newSize: number) => {
      if (!accelerator) {
        return '';
      }

      const detectedAcceleratorCount = Object.entries(detectedAcceleratorInfo.available).find(
        ([identifier]) => accelerator?.spec.identifier === identifier,
      )?.[1];

      if (detectedAcceleratorCount === undefined) {
        return `No accelerator detected with the identifier ${accelerator?.spec.identifier}.`;
      } else if (newSize > detectedAcceleratorCount) {
        return `Only ${detectedAcceleratorCount} accelerator${
          detectedAcceleratorCount > 1 ? 's' : ''
        } detected.`;
      }

      return '';
    },
    [accelerator, detectedAcceleratorInfo.available],
  );

  React.useEffect(() => {
    setAcceleratorCountWarning(validateAcceleratorCount(acceleratorCount));
  }, [acceleratorCount, validateAcceleratorCount]);

  const [acceleratorCountWarning, setAcceleratorCountWarning] = React.useState(
    validateAcceleratorCount(acceleratorCount),
  );

  const isAcceleratorSupported = (accelerator: AcceleratorKind) =>
    supportedAccelerators?.includes(accelerator.spec.identifier);

  const enabledAccelerators = accelerators.filter((ac) => ac.spec.enabled);

  const options = enabledAccelerators
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
    .map((ac) => ({
      key: ac.metadata.name,
      selectedLabel: ac.spec.displayName,
      description: ac.spec.description,
      label: (
        <Split>
          <SplitItem>{ac.spec.displayName}</SplitItem>
          <SplitItem isFilled />
          <SplitItem>
            {isAcceleratorSupported(ac) && (
              <Label color="blue">{supportedText ?? 'Compatible with image'}</Label>
            )}
          </SplitItem>
        </Split>
      ),
    }));

  let acceleratorAlertMessage: { title: string; variant: AlertVariant } | null = null;
  if (accelerator && supportedAccelerators !== undefined) {
    if (supportedAccelerators?.length === 0) {
      acceleratorAlertMessage = {
        title:
          "The image you have selected doesn't support the selected accelerator. It is recommended to use a compatible image for optimal performance.",
        variant: AlertVariant.info,
      };
    } else if (!isAcceleratorSupported(accelerator)) {
      acceleratorAlertMessage = {
        title: 'The image you have selected is not compatible with the selected accelerator',
        variant: AlertVariant.warning,
      };
    }
  }

  const onStep = (step: number) => {
    setAcceleratorCount(Math.max(acceleratorCount + step, 0));
  };

  if (!loaded || loadError || enabledAccelerators.length === 0) {
    return <></>;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Accelerator" fieldId="modal-notebook-accelerator">
          <SimpleDropdownSelect
            isFullWidth
            options={[
              ...options,
              {
                key: '',
                label: 'None',
                isPlaceholder: true,
              },
            ]}
            value={accelerator?.metadata.name ?? ''}
            onChange={(key, isPlaceholder) => {
              if (isPlaceholder) {
                setAccelerator(undefined);
                setAcceleratorCount(0);
              } else {
                setAccelerator(accelerators.find((ac) => ac.metadata.name === key));
              }
            }}
          ></SimpleDropdownSelect>
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
                min={0}
                onPlus={() => onStep(1)}
                onMinus={() => onStep(-1)}
                onChange={(event) => {
                  if (isHTMLInputElement(event.target)) {
                    const newSize = Number(event.target.value);
                    setAcceleratorCount(newSize);
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
