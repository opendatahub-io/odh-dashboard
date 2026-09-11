/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import AutoragExperimentSettingsModelSelection from '~/app/components/configure/AutoragExperimentSettingsModelSelection';
import { useMaaSModelsQuery } from '~/app/hooks/queries';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('~/app/hooks/queries', () => ({
  useMaaSModelsQuery: jest.fn(),
}));

jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: (props: Record<string, unknown>) => <button {...props} />,
}));

const schema = createConfigureSchema();
const mockUseMaaSModelsQuery = jest.mocked(useMaaSModelsQuery);
const models = [
  { id: 'model-a', display_name: 'Model A', ready: true },
  { id: 'model-b', description: 'Model B description', ready: true },
];

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    defaultValues: { ...schema.defaults, maas_secret_name: 'maas-secret' },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

describe('AutoragExperimentSettingsModelSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMaaSModelsQuery.mockReturnValue({
      data: { models },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useMaaSModelsQuery>);
  });

  it('should show the same MaaS model list in both tabs', async () => {
    const user = userEvent.setup();
    render(
      <FormWrapper>
        <AutoragExperimentSettingsModelSelection />
      </FormWrapper>,
    );

    expect(screen.getAllByTestId('model-row-model-a')).toHaveLength(2);
    expect(screen.getAllByText('Model A')).toHaveLength(2);
    await user.click(screen.getByTestId('embedding-models-tab'));
    expect(screen.getAllByTestId('model-row-model-a')).toHaveLength(2);
    expect(screen.getAllByTestId('model-row-model-b')[0].querySelector('span')).toHaveAttribute(
      'title',
      'Model B description',
    );
  });

  it('should allow independent generation and embedding selections', async () => {
    const user = userEvent.setup();
    render(
      <FormWrapper>
        <AutoragExperimentSettingsModelSelection />
      </FormWrapper>,
    );

    await user.click(screen.getAllByTestId('model-row-model-a')[0].querySelector('input')!);
    await user.click(screen.getByTestId('embedding-models-tab'));
    await user.click(screen.getAllByTestId('model-row-model-a')[1].querySelector('input')!);

    expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('1');
    expect(screen.getByTestId('embedding-selected-count')).toHaveTextContent('1');
  });
});
