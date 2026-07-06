import * as React from 'react';
import {
  FormGroup,
  Popover,
  Icon,
  Flex,
  FlexItem,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import { normalizeBetween } from '#~/utilities/utils';

const lowerLimit = 0;
const upperLimit = 99;

type ReplicaSectionProps = {
  value: number;
  onChange: (value: number) => void;
  infoContent?: string;
  isRequired?: boolean;
  /**
   * @deprecated -- name is bad, currently unused -- showMinMax sounds like 'show both min and max'
   * When support is brought back for this -- we should name this something like "minMaxAsOne" or something
   * Also we should support EitherNotBoth type definition & tie 'minMaxAsOne' & onMaxChange & onMinChange
   * onChange makes only sense when you have 1 value -- mixing min & max is confusing. Either we embrace
   * it all together or make unique API the component types specifically.
   */
  showMinMax?: boolean;
  maxValue: number;
  onMaxChange?: (value: number) => void;
  onValidationChange?: (hasValidationErrors: boolean) => void;
};

const ReplicaSection: React.FC<ReplicaSectionProps> = ({
  value,
  onChange,
  infoContent,
  isRequired = false,
  showMinMax = true,
  maxValue,
  onMaxChange,
  onValidationChange,
}) => {
  const [editingField, setEditingField] = React.useState<'min' | 'max' | null>(null);
  const [isMinEmpty, setIsMinEmpty] = React.useState(false);
  const [isMaxEmpty, setIsMaxEmpty] = React.useState(false);
  const maxLessThanMin = !showMinMax && maxValue < value;
  const minGreaterThanMax = !showMinMax && value > maxValue;
  const showMinWarning = minGreaterThanMax && editingField === 'min';
  const showMaxWarning = maxLessThanMin && editingField === 'max';

  const hasValidationErrors = editingField !== null && (showMinWarning || showMaxWarning);

  React.useEffect(() => {
    onValidationChange?.(hasValidationErrors);
  }, [hasValidationErrors, onValidationChange]);

  return (
    <FormGroup
      label="Number of model server replicas to deploy"
      data-testid="model-server-replicas"
      labelHelp={
        infoContent ? (
          <Popover bodyContent={<div>{infoContent}</div>}>
            <Icon aria-label="Model server replicas info" role="button">
              <OutlinedQuestionCircleIcon />
            </Icon>
          </Popover>
        ) : undefined
      }
      fieldId="model-server-replicas"
      isRequired={isRequired}
    >
      <Flex>
        <FlexItem>
          {!showMinMax && (
            <FormGroup
              label={<span style={{ fontWeight: 'normal' }}>Minimum replicas</span>}
              fieldId="min-replicas"
              data-testid="min-replicas"
            >
              <NumberInputWrapper
                min={isMinEmpty && editingField === 'min' ? undefined : lowerLimit}
                max={upperLimit}
                value={isMinEmpty && editingField === 'min' ? '' : value}
                validated={showMinWarning ? 'warning' : 'default'}
                plusBtnProps={{ isDisabled: value >= maxValue }}
                onFocus={() => setEditingField('min')}
                onBlur={() => {
                  setEditingField(null);
                  setIsMinEmpty(false);
                  if (value > maxValue) {
                    onChange(maxValue);
                  }
                }}
                onChange={(val) => {
                  setEditingField('min');
                  if (val === undefined) {
                    setIsMinEmpty(true);
                    return;
                  }
                  setIsMinEmpty(false);
                  const newSize = Number(val);
                  if (!Number.isNaN(newSize) && newSize <= upperLimit) {
                    onChange(normalizeBetween(newSize, lowerLimit, upperLimit));
                  }
                }}
              />
            </FormGroup>
          )}
          {showMinMax && (
            <NumberInputWrapper
              min={lowerLimit}
              max={upperLimit}
              value={value}
              onChange={(val) => {
                const newSize = val === undefined ? 0 : Number(val);
                if (!Number.isNaN(newSize) && newSize <= upperLimit) {
                  onChange(normalizeBetween(newSize, lowerLimit, upperLimit));
                }
              }}
            />
          )}
        </FlexItem>
        {!showMinMax && onMaxChange && (
          <FlexItem>
            <FormGroup
              label={<span style={{ fontWeight: 'normal' }}>Maximum replicas</span>}
              fieldId="max-replicas"
              data-testid="max-replicas"
              style={{ position: 'relative' }}
            >
              <NumberInputWrapper
                min={isMaxEmpty && editingField === 'max' ? undefined : lowerLimit}
                max={upperLimit}
                value={isMaxEmpty && editingField === 'max' ? '' : maxValue}
                validated={showMaxWarning ? 'warning' : 'default'}
                minusBtnProps={{ isDisabled: maxValue <= value }}
                onFocus={() => setEditingField('max')}
                onBlur={() => {
                  setEditingField(null);
                  setIsMaxEmpty(false);
                  if (maxValue < value) {
                    onMaxChange(value);
                  }
                }}
                onChange={(val) => {
                  setEditingField('max');
                  if (val === undefined) {
                    setIsMaxEmpty(true);
                    return;
                  }
                  setIsMaxEmpty(false);
                  const newSize = Number(val);
                  if (!Number.isNaN(newSize) && newSize <= upperLimit) {
                    onMaxChange(normalizeBetween(newSize, lowerLimit, upperLimit));
                  }
                }}
              />
            </FormGroup>
          </FlexItem>
        )}
      </Flex>
      {!showMinMax && (showMinWarning || showMaxWarning) && (
        <>
          {showMinWarning && (
            <FormHelperText
              style={{
                whiteSpace: 'nowrap',
              }}
            >
              <HelperText>
                <HelperTextItem icon={<ExclamationTriangleIcon />} variant="warning">
                  Minimum replicas must be less than or equal to maximum replicas.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
          {showMaxWarning && (
            <FormHelperText
              style={{
                whiteSpace: 'nowrap',
              }}
            >
              <HelperText>
                <HelperTextItem icon={<ExclamationTriangleIcon />} variant="warning">
                  Maximum replicas must be greater than or equal to minimum replicas.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </>
      )}
    </FormGroup>
  );
};

export default ReplicaSection;
