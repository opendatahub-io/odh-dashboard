import * as React from 'react';
import {
  Button,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from '@patternfly/react-core';
import WeightDistributionBar, { type WeightSegment } from '~/app/components/WeightDistributionBar';
import {
  percentagesToWeights,
  ratiosToWeights,
  redistributeWeight,
  weightsToRatios,
  weightsToPercentages,
} from '~/app/utilities/weightDistributionUtils';
import './BenchmarkWeightsModal.scss';

type BenchmarkWeightsModalProps = {
  segments: WeightSegment[];
  minWeightPercent: number;
  onSave: (weights: number[]) => void;
  onClose: () => void;
};

const normalizeDraftPercentages = (
  segments: WeightSegment[],
  minWeightPercent: number,
): number[] => {
  const percentages = weightsToPercentages(segments.map((segment) => segment.weight));
  if (percentages.length < 2) {
    return percentages;
  }

  const effectiveMinimum = Math.min(
    Math.max(0, Math.round(minWeightPercent)),
    Math.floor(100 / percentages.length),
  );

  if (percentages.every((percentage) => percentage >= effectiveMinimum)) {
    return percentages;
  }

  const largestPercentageIndex = percentages.reduce(
    (largestIndex, percentage, index) =>
      percentage > (percentages[largestIndex] ?? 0) ? index : largestIndex,
    0,
  );
  return redistributeWeight(
    percentages,
    largestPercentageIndex,
    percentages[largestPercentageIndex] ?? effectiveMinimum,
    minWeightPercent,
  );
};

const normalizeDraftRatios = (segments: WeightSegment[], minWeightPercent: number): number[] =>
  weightsToRatios(percentagesToWeights(normalizeDraftPercentages(segments, minWeightPercent)));

const isPositiveIntegerRatio = (value: string): boolean => {
  const ratio = Number(value);
  return Number.isInteger(ratio) && ratio > 0;
};

const BenchmarkWeightsModal: React.FC<BenchmarkWeightsModalProps> = ({
  segments,
  minWeightPercent,
  onSave,
  onClose,
}) => {
  const [draftRatios, setDraftRatios] = React.useState<string[]>(() =>
    normalizeDraftRatios(segments, minWeightPercent).map(String),
  );

  React.useEffect(() => {
    setDraftRatios(normalizeDraftRatios(segments, minWeightPercent).map(String));
  }, [minWeightPercent, segments]);

  const draftRatioValues = React.useMemo(
    () => draftRatios.map((ratio) => (isPositiveIntegerRatio(ratio) ? Number(ratio) : 0)),
    [draftRatios],
  );
  const isDraftValid =
    draftRatios.length === segments.length && draftRatios.every(isPositiveIntegerRatio);

  const draftSegments = React.useMemo(
    () =>
      segments.map((segment, index) => ({
        ...segment,
        weight: draftRatioValues[index] ?? 0,
        percentage: 0,
      })),
    [draftRatioValues, segments],
  );

  const handleRatioChange = React.useCallback((index: number, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) {
      return;
    }

    setDraftRatios((previous) =>
      previous.map((ratio, ratioIndex) => (ratioIndex === index ? value : ratio)),
    );
  }, []);

  const handleRatioKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }, []);

  const handleSave = React.useCallback(() => {
    if (!isDraftValid) {
      return;
    }

    onSave(ratiosToWeights(draftRatioValues));
    onClose();
  }, [draftRatioValues, isDraftValid, onClose, onSave]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="medium"
      id="copy-suite-settings-benchmark-weights-modal"
      data-testid="copy-suite-settings-benchmark-weights-modal"
    >
      <ModalHeader
        title="Adjust benchmark weights"
        description="Enter a positive integer ratio for each benchmark. A ratio of 2 gives twice the weight of a ratio of 1; ratios of 1 and 1 give equal weight."
      />
      <ModalBody
        id="copy-suite-settings-benchmark-weights-body"
        className="evalhub-benchmark-weights-modal__body"
      >
        <div className="evalhub-benchmark-weights-modal__sticky-bar">
          <WeightDistributionBar segments={draftSegments} showPercentages={false} />
        </div>
        <div className="evalhub-benchmark-weights-modal__inputs">
          {segments.map((segment, index) => (
            <FormGroup
              key={`${segment.label}-${index}`}
              label={
                <span
                  className="evalhub-benchmark-weights-modal__input-label"
                  title={segment.label}
                >
                  {segment.label}
                </span>
              }
              fieldId={`benchmark-weight-${index}`}
            >
              <TextInput
                id={`benchmark-weight-${index}`}
                data-testid={`benchmark-weight-input-${index}`}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={draftRatios[index] ?? ''}
                onChange={(_event, value) => handleRatioChange(index, value)}
                onKeyDown={handleRatioKeyDown}
                isRequired
                validated={isPositiveIntegerRatio(draftRatios[index]) ? 'default' : 'error'}
                aria-label={`${segment.label} weight ratio`}
              />
            </FormGroup>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          data-testid="benchmark-weights-save"
          onClick={handleSave}
          isDisabled={!isDraftValid}
        >
          Save
        </Button>
        <Button variant="link" data-testid="benchmark-weights-cancel" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default BenchmarkWeightsModal;
