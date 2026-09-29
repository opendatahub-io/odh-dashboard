/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import AutoragExperimentSettingsModelSelection from '~/app/components/configure/AutoragExperimentSettingsModelSelection';
import { ConfigureSchema, createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: (props: Record<string, unknown>) => <button {...props} />,
}));

const schema = createConfigureSchema();
const models = [
  { id: 'model-a', display_name: 'Model A', ready: true },
  { id: 'model-b', description: 'Model B description', ready: true },
  { id: 'model-c', display_name: 'Model C', ready: false },
];

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    defaultValues: { ...schema.defaults, maas_secret_name: 'maas-secret' },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const ModelSelectionForm: React.FC = () => {
  const { control, setValue } = useFormContext<ConfigureSchema>();
  const [generationModels, embeddingModels] = useWatch({
    control,
    name: ['generation_models', 'embedding_models'],
  });

  return (
    <AutoragExperimentSettingsModelSelection
      generationModels={generationModels}
      embeddingModels={embeddingModels}
      models={models}
      modelsLoaded
      modelsLoading={false}
      onGenerationModelsChange={(selectedModels) => setValue('generation_models', selectedModels)}
      onEmbeddingModelsChange={(selectedModels) => setValue('embedding_models', selectedModels)}
    />
  );
};

describe('AutoragExperimentSettingsModelSelection', () => {
  it('should show a skeleton until the parent confirms MaaS models are loaded', () => {
    render(
      <FormWrapper>
        <AutoragExperimentSettingsModelSelection
          generationModels={['model-a']}
          embeddingModels={['model-b']}
          models={[]}
          modelsLoaded={false}
          modelsLoading
          onGenerationModelsChange={jest.fn()}
          onEmbeddingModelsChange={jest.fn()}
        />
      </FormWrapper>,
    );

    expect(screen.getByTestId('modal-maas-models-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('llm-selected-count')).not.toBeInTheDocument();
  });

  it('should show the same MaaS model list in both tabs', async () => {
    const user = userEvent.setup();
    render(
      <FormWrapper>
        <ModelSelectionForm />
      </FormWrapper>,
    );

    expect(screen.getAllByTestId('model-row-model-a')).toHaveLength(2);
    expect(screen.getAllByText('Model A')).toHaveLength(2);
    expect(screen.getByTestId('llm-selected-count')).toHaveTextContent(/0.2/);
    expect(screen.getByTestId('embedding-selected-count')).toHaveTextContent(/0.2/);
    await user.click(screen.getByTestId('embedding-models-tab'));
    expect(screen.getAllByTestId('model-row-model-a')).toHaveLength(2);
    expect(screen.getAllByTestId('model-row-model-b')[0].querySelector('span')).toHaveAttribute(
      'title',
      'Model B description',
    );
  });

  it('should disable a model in the opposite category after it is selected', async () => {
    const user = userEvent.setup();
    render(
      <FormWrapper>
        <ModelSelectionForm />
      </FormWrapper>,
    );

    await user.click(screen.getAllByTestId('model-row-model-a')[0].querySelector('input')!);
    await user.click(screen.getByTestId('embedding-models-tab'));

    expect(screen.getByTestId('llm-selected-count')).toHaveTextContent(/1.2/);
    expect(screen.getByTestId('embedding-selected-count')).toHaveTextContent(/0.2/);
    expect(screen.getAllByTestId('model-row-model-a')[1].querySelector('input')).toBeDisabled();
    expect(
      screen.getAllByTestId('model-row-model-a')[1].querySelector('input'),
    ).toHaveAccessibleName('Model A unavailable: already selected in Foundation models');
    expect(screen.getAllByText('Unavailable: already selected in Foundation models')).toHaveLength(
      1,
    );
  });

  it('should select only models not selected in the opposite category with select all', async () => {
    const user = userEvent.setup();
    render(
      <FormWrapper>
        <ModelSelectionForm />
      </FormWrapper>,
    );

    await user.click(screen.getAllByTestId('model-row-model-a')[0].querySelector('input')!);
    await user.click(screen.getByTestId('embedding-models-tab'));
    const selectAll = screen.getByTestId('embedding-models-table').querySelector('thead input')!;
    await user.click(selectAll);

    expect(screen.getByTestId('llm-selected-count')).toHaveTextContent(/1.2/);
    expect(screen.getByTestId('embedding-selected-count')).toHaveTextContent(/1.2/);
    expect(selectAll).toBeChecked();
    expect(screen.getAllByTestId('model-row-model-a')[1].querySelector('input')).toBeDisabled();
    expect(screen.getAllByTestId('model-row-model-b')[1].querySelector('input')).toBeChecked();

    await user.click(selectAll);

    expect(screen.getByTestId('embedding-selected-count')).toHaveTextContent(/0.2/);
    expect(selectAll).not.toBeChecked();
  });

  it('should show an unready model but disable its checkbox with an explanation', () => {
    render(
      <FormWrapper>
        <ModelSelectionForm />
      </FormWrapper>,
    );

    const checkbox = screen.getAllByTestId('model-row-model-c')[0].querySelector('input');
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveAccessibleName('Model C unavailable: model is not ready');
    expect(screen.getAllByText('Unavailable: model is not ready')).toHaveLength(2);
  });

  it('should exclude unready models from select all and selected counts', async () => {
    const user = userEvent.setup();
    render(
      <FormWrapper>
        <ModelSelectionForm />
      </FormWrapper>,
    );

    await user.click(screen.getByTestId('llm-models-table').querySelector('thead input')!);

    expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('2∕2');
    expect(screen.getAllByTestId('model-row-model-c')[0].querySelector('input')).not.toBeChecked();
  });
});
