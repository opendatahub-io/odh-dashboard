import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import CopySuiteBenchmarksStep from '~/app/pages/CopySuiteBenchmarksStep';
import { copySuiteDefaultValues, type CopySuiteFormValues } from '~/app/schemas/copySuite.schema';

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
        isValid={false}
        isSubmitting={false}
        onUpdateBenchmark={jest.fn()}
        onWeightsChange={jest.fn()}
        onSaveAndRun={jest.fn()}
        onSaveOnly={jest.fn()}
        onBack={onBack}
        onCancel={jest.fn()}
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
});
