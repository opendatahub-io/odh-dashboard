import * as React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { setupTrackingTest } from '~/__tests__/unit/testUtils/setupTrackingTest';
import CopySuiteBenchmarksStep from '~/app/pages/CopySuiteBenchmarksStep';
import type { CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';
import { copySuiteDefaultValues, type CopySuiteFormValues } from '~/app/schemas/copySuite.schema';
import { testDataRefDefaultValues } from '~/app/schemas/testDataRef.schema';

const { render } = setupTrackingTest();

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useModularArchContext: () => ({
    config: { deploymentMode: 'federated', URL_PREFIX: '', BFF_API_VERSION: 'v1' },
  }),
}));

jest.mock('~/app/components/BenchmarkWeightsModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/components/CopySuiteBenchmarkDetailsOverlay', () => ({
  __esModule: true,
  default: () => null,
}));

const EmptyBenchmarksStep: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const form = useForm<CopySuiteFormValues>({ defaultValues: copySuiteDefaultValues });

  return (
    <FormProvider {...form}>
      <CopySuiteBenchmarksStep
        benchmarks={[]}
        providers={[]}
        showWeightEdit={false}
        weightSegments={[]}
        minWeightPercent={5}
        onUpdateBenchmark={jest.fn()}
        onWeightsChange={jest.fn()}
        onBack={onBack}
      />
    </FormProvider>
  );
};

const ConfiguredBenchmarksStep: React.FC = () => {
  const form = useForm<CopySuiteFormValues>({ defaultValues: copySuiteDefaultValues });
  const benchmark: CopySuiteBenchmark = {
    id: 'planning',
    providerId: 'provider-one',
    name: 'Planning quality',
    weight: 1,
    parameters: [],
    testDataRef: { ...testDataRefDefaultValues },
    threshold: 70,
    availableMetrics: [],
  };

  return (
    <FormProvider {...form}>
      <CopySuiteBenchmarksStep
        benchmarks={[benchmark]}
        providers={[]}
        showWeightEdit={false}
        weightSegments={[]}
        minWeightPercent={5}
        onUpdateBenchmark={jest.fn()}
        onWeightsChange={jest.fn()}
        onBack={jest.fn()}
      />
    </FormProvider>
  );
};

describe('CopySuiteBenchmarksStep', () => {
  it('should return to select benchmarks from the defensive empty state', () => {
    const onBack = jest.fn();
    render(<EmptyBenchmarksStep onBack={onBack} />);

    expect(screen.getByTestId('copy-suite-benchmarks-empty-state')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('copy-suite-empty-back-btn'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should describe the benchmark settings before the fields', () => {
    render(<ConfiguredBenchmarksStep />);

    expect(
      screen.getByRole('heading', { name: 'Benchmark settings', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Configure each benchmark with a primary metric, threshold, and any framework-specific settings.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-section-0')).toBeInTheDocument();
  });
});
