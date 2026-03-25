import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { K8sResourceIdentifier } from '@openshift/dynamic-plugin-sdk-utils';
import ModelServerTemplateSelectField, {
  type ModelServerOption,
  type ModelServerSelectField,
} from '../ModelServerTemplateSelectField';

const minimalTemplate: K8sResourceIdentifier = { apiVersion: 'v1', kind: 'Template' };

const mockSuggestion: ModelServerOption = {
  name: 'suggested-runtime',
  label: 'Suggested Runtime',
  namespace: 'opendatahub',
  scope: 'global',
};

const mockOption: ModelServerOption = {
  name: 'custom-runtime',
  label: 'Custom Runtime',
  namespace: 'my-project',
  scope: 'project',
};

const makeModelServerState = (
  overrides: Partial<ModelServerSelectField> = {},
): ModelServerSelectField => ({
  data: undefined,
  setData: jest.fn(),
  options: [],
  ...overrides,
});

describe('ModelServerTemplateSelectField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('radio state (non-editing mode)', () => {
    it('should disable radio 1 and show the dropdown when there is no suggestion', () => {
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({ data: { suggestion: null } })}
        />,
      );
      const [radio1, radio2] = screen.getAllByRole('radio');
      expect(radio1).toBeDisabled();
      expect(radio2).toBeChecked();
      expect(screen.getByTestId('serving-runtime-template-selection-toggle')).toBeInTheDocument();
      expect(screen.getByText('Select one')).toBeInTheDocument();
    });

    it('should check radio 1, show the suggestion body, and hide the dropdown when autoSelect is true', () => {
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { suggestion: mockSuggestion, autoSelect: true },
          })}
        />,
      );
      const [radio1, radio2] = screen.getAllByRole('radio');
      expect(radio1).not.toBeDisabled();
      expect(radio1).toBeChecked();
      expect(radio2).not.toBeChecked();
      expect(screen.getByText('Suggested Runtime')).toBeInTheDocument();
      expect(
        screen.queryByTestId('serving-runtime-template-selection-toggle'),
      ).not.toBeInTheDocument();
    });

    it('should enable radio 1 but check radio 2 with the dropdown when autoSelect is false', () => {
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { suggestion: mockSuggestion, autoSelect: false },
          })}
        />,
      );
      const [radio1, radio2] = screen.getAllByRole('radio');
      expect(radio1).not.toBeDisabled();
      expect(radio1).not.toBeChecked();
      expect(radio2).toBeChecked();
      expect(screen.getByTestId('serving-runtime-template-selection-toggle')).toBeInTheDocument();
      expect(screen.queryByText('Suggested Runtime')).not.toBeInTheDocument();
    });
  });

  describe('suggestion body content (radio 1 body when autoSelect is true)', () => {
    it('should show the version label when the suggestion has a version', () => {
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { suggestion: { ...mockSuggestion, version: '2.0.0' }, autoSelect: true },
          })}
        />,
      );
      expect(screen.getByTestId('serving-runtime-version-label')).toHaveTextContent('2.0.0');
    });

    it('should show "Compatible with hardware profile" when the suggestion has a template and is compatible', () => {
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: {
              suggestion: {
                ...mockSuggestion,
                template: minimalTemplate,
                compatibleWithHardwareProfile: true,
              },
              autoSelect: true,
            },
          })}
        />,
      );
      expect(screen.getByText('Compatible with hardware profile')).toBeInTheDocument();
    });

    it('should not show "Compatible with hardware profile" when the suggestion has no template', () => {
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: {
              suggestion: { ...mockSuggestion, compatibleWithHardwareProfile: true },
              autoSelect: true,
            },
          })}
        />,
      );
      expect(screen.queryByText('Compatible with hardware profile')).not.toBeInTheDocument();
    });
  });

  describe('dropdown toggle display', () => {
    it('should show the selected option label and version in the toggle', () => {
      const optionWithVersion: ModelServerOption = { ...mockOption, version: '1.2.3' };
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { autoSelect: false, selection: optionWithVersion },
            options: [optionWithVersion],
          })}
        />,
      );
      expect(screen.getByTestId('serving-runtime-template-selection-toggle')).toHaveTextContent(
        'Custom Runtime',
      );
      expect(screen.getByTestId('serving-runtime-version-label')).toHaveTextContent('1.2.3');
    });

    it('should not show a version label in the toggle when the selected option has no version', () => {
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { autoSelect: false, selection: mockOption },
            options: [mockOption],
          })}
        />,
      );
      expect(screen.queryByTestId('serving-runtime-version-label')).not.toBeInTheDocument();
    });
  });

  describe('dropdown menu items', () => {
    it('should show the version label in a menu item when the option has a version', async () => {
      const optionWithVersion: ModelServerOption = { ...mockOption, version: '3.1.0' };
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { autoSelect: false, selection: null },
            options: [optionWithVersion],
          })}
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId('serving-runtime-template-selection-toggle'));
      });
      expect(screen.getByTestId('serving-runtime-version-label')).toHaveTextContent('3.1.0');
    });

    it('should show "Compatible with hardware profile" in a menu item when the option is compatible', async () => {
      const compatibleOption: ModelServerOption = {
        ...mockOption,
        template: minimalTemplate,
        compatibleWithHardwareProfile: true,
      };
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { autoSelect: false, selection: null },
            options: [compatibleOption],
          })}
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId('serving-runtime-template-selection-toggle'));
      });
      expect(screen.getByText('Compatible with hardware profile')).toBeInTheDocument();
    });

    it('should not show "Compatible with hardware profile" when the option has no template', async () => {
      const optionWithoutTemplate: ModelServerOption = {
        ...mockOption,
        compatibleWithHardwareProfile: true,
      };
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { autoSelect: false, selection: null },
            options: [optionWithoutTemplate],
          })}
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId('serving-runtime-template-selection-toggle'));
      });
      expect(screen.queryByText('Compatible with hardware profile')).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call setData with autoSelect true and the suggestion when radio 1 is clicked', async () => {
      const mockSetData = jest.fn();
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { suggestion: mockSuggestion, autoSelect: false },
            setData: mockSetData,
          })}
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getAllByRole('radio')[0]);
      });
      expect(mockSetData).toHaveBeenCalledWith(
        expect.objectContaining({ autoSelect: true, selection: mockSuggestion }),
      );
    });

    it('should call setData with autoSelect false and null selection when radio 2 is clicked', async () => {
      const mockSetData = jest.fn();
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { suggestion: mockSuggestion, autoSelect: true, selection: mockSuggestion },
            setData: mockSetData,
          })}
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getAllByRole('radio')[1]);
      });
      expect(mockSetData).toHaveBeenCalledWith(
        expect.objectContaining({ autoSelect: false, selection: null }),
      );
    });
  });

  describe('editing mode (isEditing = true)', () => {
    it('should show a disabled locked dropdown without radio buttons', () => {
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({
            data: { selection: mockOption },
            options: [mockOption],
          })}
          isEditing
        />,
      );
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
      const toggle = screen.getByTestId('serving-runtime-template-selection-toggle');
      expect(toggle).toBeDisabled();
      expect(toggle).toHaveTextContent('Custom Runtime');
    });

    it('should show placeholder text when editing with no existing selection', () => {
      render(
        <ModelServerTemplateSelectField
          modelServerState={makeModelServerState({ data: { selection: null } })}
          isEditing
        />,
      );
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
      expect(screen.getByText('Select one')).toBeInTheDocument();
    });
  });
});
