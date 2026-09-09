import * as React from 'react';
import {
  Button,
  Content,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Slider,
  type SliderOnChangeEvent,
} from '@patternfly/react-core';
import WeightDistributionBar, { type WeightSegment } from '~/app/components/WeightDistributionBar';
import {
  percentagesToWeights,
  redistributeWeight,
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

const BenchmarkWeightsModal: React.FC<BenchmarkWeightsModalProps> = ({
  segments,
  minWeightPercent,
  onSave,
  onClose,
}) => {
  const [draftPercentages, setDraftPercentages] = React.useState<number[]>(() =>
    normalizeDraftPercentages(segments, minWeightPercent),
  );

  React.useEffect(() => {
    setDraftPercentages(normalizeDraftPercentages(segments, minWeightPercent));
  }, [minWeightPercent, segments]);

  const draftSegments = React.useMemo(
    () =>
      segments.map((segment, index) => ({
        ...segment,
        weight: draftPercentages[index] / 100,
        percentage: draftPercentages[index] ?? 0,
      })),
    [draftPercentages, segments],
  );

  const handleSliderChange = React.useCallback(
    (index: number) =>
      (
        _event: SliderOnChangeEvent,
        sliderValue: number,
        inputValue?: number,
        setThumbValue?: React.Dispatch<React.SetStateAction<number>>,
      ) => {
        const resolved =
          inputValue === undefined
            ? Math.round(sliderValue)
            : Math.max(0, Math.min(100, Math.round(inputValue)));

        if (inputValue !== undefined && inputValue > 100) {
          setThumbValue?.(100);
        } else if (inputValue !== undefined && inputValue < 0) {
          setThumbValue?.(0);
        }

        setDraftPercentages((prev) => redistributeWeight(prev, index, resolved, minWeightPercent));
      },
    [minWeightPercent],
  );

  const handleSave = React.useCallback(() => {
    onSave(percentagesToWeights(draftPercentages));
    onClose();
  }, [draftPercentages, onClose, onSave]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="medium"
      id="copy-suite-settings-benchmark-weights-modal"
      data-testid="copy-suite-settings-benchmark-weights-modal"
    >
      <ModalHeader
        title="Compare and rebalance benchmark weights"
        description="Compare and rebalance how much each benchmark contributes to the overall suite score. Weights always total 100%."
      />
      <ModalBody
        id="copy-suite-settings-benchmark-weights-body"
        className="evalhub-benchmark-weights-modal__body"
      >
        <Content component="p" className="evalhub-benchmark-weights-modal__intro">
          Weights always total 100%. Changing one benchmark redistributes the remainder across the
          others.
        </Content>
        <div className="evalhub-benchmark-weights-modal__sticky-bar">
          <WeightDistributionBar segments={draftSegments} />
        </div>
        <div className="evalhub-benchmark-weights-modal__sliders">
          {segments.map((segment, index) => (
            <FormGroup
              key={`${segment.label}-${index}`}
              label={segment.label}
              fieldId={`benchmark-weight-${index}`}
            >
              <Slider
                data-testid={`benchmark-weight-slider-${index}`}
                min={minWeightPercent}
                max={100 - (segments.length - 1) * minWeightPercent}
                value={draftPercentages[index]}
                inputValue={draftPercentages[index]}
                onChange={handleSliderChange(index)}
                isInputVisible
                inputAriaLabel={`${segment.label} weight`}
              />
            </FormGroup>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" data-testid="benchmark-weights-save" onClick={handleSave}>
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
