import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Form,
  Title,
} from '@patternfly/react-core';
import type { CuratedCollectionParameterConfig } from '~/app/curatedSuiteConfig';
import CopySuiteBenchmarkDetailsOverlay from '~/app/components/CopySuiteBenchmarkDetailsOverlay';
import CopySuiteBenchmarkSection from '~/app/components/CopySuiteBenchmarkSection';
import BenchmarkWeightsModal from '~/app/components/BenchmarkWeightsModal';
import type { WeightSegment } from '~/app/components/WeightDistributionBar';
import { getBenchmarkKey, type CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';
import type { CopySuiteFormValues } from '~/app/schemas/copySuite.schema';
import {
  toTestDataRefFieldErrors,
  type TestDataRefFormField,
} from '~/app/schemas/testDataRef.schema';
import type { Provider } from '~/app/types';
import { buildFlatBenchmarkByKey } from '~/app/utilities/benchmarkDetailsUtils';
import { weightsToRatios } from '~/app/utilities/weightDistributionUtils';

import './CopySuiteBenchmarksStep.scss';

type CopySuiteBenchmarksStepProps = {
  benchmarks: CopySuiteBenchmark[];
  providers: Provider[];
  showWeightEdit: boolean;
  weightSegments: WeightSegment[];
  minWeightPercent: number;
  isInteractionDisabled?: boolean;
  parameterConfig?: Record<string, CuratedCollectionParameterConfig>;
  onUpdateBenchmark: (index: number, field: keyof CopySuiteBenchmark, value: unknown) => void;
  onWeightsChange: (weights: number[]) => void;
  onBack: () => void;
};

const CopySuiteBenchmarksStep: React.FC<CopySuiteBenchmarksStepProps> = ({
  benchmarks,
  providers,
  showWeightEdit,
  weightSegments,
  minWeightPercent,
  isInteractionDisabled = false,
  parameterConfig,
  onUpdateBenchmark,
  onWeightsChange,
  onBack,
}) => {
  const {
    formState: { errors },
  } = useFormContext<CopySuiteFormValues>();
  const [detailsBenchmarkKey, setDetailsBenchmarkKey] = React.useState<string | undefined>();
  const [isWeightsModalOpen, setIsWeightsModalOpen] = React.useState(false);

  React.useLayoutEffect(() => {
    if (isInteractionDisabled) {
      setDetailsBenchmarkKey(undefined);
      setIsWeightsModalOpen(false);
    }
  }, [isInteractionDisabled]);

  const flatBenchmarkByKey = React.useMemo(() => buildFlatBenchmarkByKey(providers), [providers]);

  const getParameterErrors = (index: number): Record<string, string> | undefined => {
    const parameterErrors = errors.benchmarks?.[index]?.parameters;
    if (!Array.isArray(parameterErrors)) {
      return undefined;
    }
    const result: Record<string, string> = {};
    parameterErrors.forEach((parameterError, parameterIndex) => {
      const message = parameterError?.value?.message;
      const key = benchmarks[index]?.parameters[parameterIndex]?.key;
      if (typeof message === 'string' && key) {
        result[key] = message;
      }
    });
    return Object.keys(result).length > 0 ? result : undefined;
  };

  const getTestDataRefErrors = (
    index: number,
  ): Partial<Record<TestDataRefFormField, string>> | undefined =>
    toTestDataRefFieldErrors(errors.benchmarks?.[index]?.testDataRef);

  const detailsBenchmark = detailsBenchmarkKey
    ? flatBenchmarkByKey.get(detailsBenchmarkKey)
    : undefined;
  const hasBenchmarks = benchmarks.length > 0;
  const weightRatios = React.useMemo(
    () => weightsToRatios(weightSegments.map((segment) => segment.weight)),
    [weightSegments],
  );
  const totalWeightRatio = weightRatios.reduce((sum, ratio) => sum + ratio, 0);
  const isDetailsBenchmarkSelected = benchmarks.some(
    (benchmark) => getBenchmarkKey(benchmark) === detailsBenchmarkKey,
  );

  return (
    <div className="evalhub-copy-suite-page__step" data-testid="copy-suite-step-benchmarks">
      <fieldset
        disabled={isInteractionDisabled}
        className="evalhub-copy-suite-benchmarks-step__fields"
        aria-busy={isInteractionDisabled}
        onClickCapture={
          isInteractionDisabled
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
              }
            : undefined
        }
        onKeyDownCapture={
          isInteractionDisabled
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
              }
            : undefined
        }
      >
        {hasBenchmarks ? (
          <div className="evalhub-copy-suite-benchmarks-step__layout">
            <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-sm">
              Benchmark settings
            </Title>
            <Content component="p" className="pf-v6-u-mb-lg">
              Configure each benchmark with a primary metric, threshold, and any framework-specific
              settings.
            </Content>
            <Form onSubmit={(event) => event.preventDefault()}>
              <div
                className="evalhub-copy-suite-benchmarks-step__sections"
                data-testid="copy-suite-benchmark-sections"
              >
                {benchmarks.map((benchmark, index) => (
                  <CopySuiteBenchmarkSection
                    key={`${benchmark.id}-${index}`}
                    benchmark={benchmark}
                    index={index}
                    showWeightEdit={showWeightEdit}
                    weightRatio={weightRatios[index] ?? 1}
                    totalWeightRatio={totalWeightRatio}
                    additionalParametersError={
                      errors.benchmarks?.[index]?.additionalParameters?.message
                    }
                    parameterErrors={getParameterErrors(index)}
                    parameterConfig={parameterConfig}
                    testDataRefErrors={getTestDataRefErrors(index)}
                    isInteractionDisabled={isInteractionDisabled}
                    onUpdate={(updatedIndex, field, value) => {
                      if (!isInteractionDisabled) {
                        onUpdateBenchmark(updatedIndex, field, value);
                      }
                    }}
                    onEditWeights={() => {
                      if (!isInteractionDisabled) {
                        setIsWeightsModalOpen(true);
                      }
                    }}
                    onOpenDetails={(benchmarkKey) => {
                      if (!isInteractionDisabled) {
                        setDetailsBenchmarkKey(benchmarkKey);
                      }
                    }}
                  />
                ))}
              </div>
            </Form>
          </div>
        ) : (
          <EmptyBenchmarksState onBack={onBack} />
        )}
      </fieldset>

      {!isInteractionDisabled ? (
        <CopySuiteBenchmarkDetailsOverlay
          benchmark={detailsBenchmark}
          isOpen={!!detailsBenchmarkKey}
          onClose={() => setDetailsBenchmarkKey(undefined)}
          onPrimaryAction={() => setDetailsBenchmarkKey(undefined)}
          primaryActionLabel={isDetailsBenchmarkSelected ? 'Selected' : 'Select benchmark'}
        />
      ) : null}

      {isWeightsModalOpen && showWeightEdit && !isInteractionDisabled ? (
        <BenchmarkWeightsModal
          segments={weightSegments}
          minWeightPercent={minWeightPercent}
          onSave={onWeightsChange}
          onClose={() => setIsWeightsModalOpen(false)}
        />
      ) : null}
    </div>
  );
};

type EmptyBenchmarksStateProps = {
  onBack: () => void;
};

const EmptyBenchmarksState: React.FC<EmptyBenchmarksStateProps> = ({ onBack }) => (
  <EmptyState
    data-testid="copy-suite-benchmarks-empty-state"
    headingLevel="h3"
    titleText="No benchmarks added"
  >
    <EmptyStateBody>No benchmarks have been added to this collection.</EmptyStateBody>
    <EmptyStateFooter>
      <EmptyStateActions>
        <Button variant="primary" data-testid="copy-suite-empty-back-btn" onClick={onBack}>
          Back to select benchmarks
        </Button>
      </EmptyStateActions>
    </EmptyStateFooter>
  </EmptyState>
);

export default CopySuiteBenchmarksStep;
