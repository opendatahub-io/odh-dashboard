import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import AutoragExperimentSettingsModelSelection from '~/app/components/configure/AutoragExperimentSettingsModelSelection';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: (props: Record<string, unknown>) => <button {...props} />,
}));

const schema = createConfigureSchema();

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({ defaultValues: schema.defaults });
  return <FormProvider {...form}>{children}</FormProvider>;
};

describe('AutoragExperimentSettingsModelSelection', () => {
  it('should show both model tables as empty until MaaS discovery is implemented', () => {
    render(
      <FormWrapper>
        <AutoragExperimentSettingsModelSelection />
      </FormWrapper>,
    );

    expect(screen.getAllByText('No models available.')).toHaveLength(2);
  });
});
