import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelCustomizationEndpointType } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import TeacherModelSection from '#~/pages/pipelines/global/modelCustomization/teacherJudgeSection/TeacherModelSection';

// judge model section is doing exact the same thing as teacher model section
// skip judge model test to avoid to many duplicated tests
describe('TeacherModelSection', () => {
  const defaultProps = {
    data: {
      endpointType: ModelCustomizationEndpointType.PUBLIC,
      endpoint: 'test-endpoint',
      modelName: 'test-model',
      apiToken: '',
    },
    setData: jest.fn(),
    handleOpenDrawer: jest.fn(),
  };

  it('should render initial value for public', () => {
    render(<TeacherModelSection {...defaultProps} />);

    expect(screen.getByTestId('teacher-section-unauthenticated-endpoint-radio')).toBeChecked();
    expect(screen.getByTestId('teacher-endpoint-input')).toHaveValue('test-endpoint');
    expect(screen.getByTestId('teacher-model-name-input')).toHaveValue('test-model');
  });

  it('should render initial value for private', () => {
    render(
      <TeacherModelSection
        {...defaultProps}
        data={{
          endpointType: ModelCustomizationEndpointType.PRIVATE,
          endpoint: 'test-endpoint',
          modelName: 'test-model',
          apiToken: 'test-token',
        }}
      />,
    );

    expect(screen.getByTestId('teacher-section-authenticated-endpoint-radio')).toBeChecked();
    expect(screen.getByTestId('teacher-endpoint-input')).toHaveValue('test-endpoint');
    expect(screen.getByTestId('teacher-token-input')).toHaveValue('test-token');
    expect(screen.getByTestId('teacher-model-name-input')).toHaveValue('test-model');
  });

  it('should show error message after fields are touched', async () => {
    const component = render(
      <TeacherModelSection
        {...defaultProps}
        data={{
          endpointType: ModelCustomizationEndpointType.PUBLIC,
          endpoint: '',
          modelName: '',
          apiToken: '',
        }}
      />,
    );

    expect(screen.queryByTestId('teacher-endpoint-input-error')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('teacher-endpoint-input'));
    fireEvent.focusOut(screen.getByTestId('teacher-endpoint-input'));
    expect(screen.queryByTestId('teacher-endpoint-input-error')).toBeInTheDocument();

    expect(screen.queryByTestId('teacher-model-name-input-error')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('teacher-model-name-input'));
    fireEvent.focusOut(screen.getByTestId('teacher-model-name-input'));
    expect(screen.queryByTestId('teacher-model-name-input-error')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('teacher-section-authenticated-endpoint-radio'));
    component.rerender(
      <TeacherModelSection
        {...defaultProps}
        data={{
          endpointType: ModelCustomizationEndpointType.PRIVATE,
          endpoint: '',
          modelName: '',
          apiToken: '',
        }}
      />,
    );

    expect(screen.queryByTestId('teacher-endpoint-input-error')).toBeInTheDocument();
    expect(screen.queryByTestId('teacher-model-name-input-error')).toBeInTheDocument();

    expect(screen.queryByTestId('teacher-token-input-error')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('teacher-token-input'));
    fireEvent.focusOut(screen.getByTestId('teacher-token-input'));
    expect(screen.queryByTestId('teacher-token-input-error')).toBeInTheDocument();
  });
});
