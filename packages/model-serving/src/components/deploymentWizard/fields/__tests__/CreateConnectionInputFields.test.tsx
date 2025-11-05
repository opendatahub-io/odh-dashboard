import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { z } from 'zod';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { mockK8sNameDescriptionFieldData } from '@odh-dashboard/internal/__mocks__/mockK8sNameDescriptionFieldData';
import {
  createConnectionDataSchema,
  CreateConnectionInputFields,
  isValidCreateConnectionData,
  useCreateConnectionData,
} from '../CreateConnectionInputFields';
import { ModelLocationType } from '../../types';

const createConnectionInputFieldsSchema = z.object({
  createConnectionData: createConnectionDataSchema,
});

const mockModelLocationData = {
  type: ModelLocationType.NEW,
  fieldValues: {
    URI: 'https://://test',
  },
  additionalFields: {},
};

describe('CreateConnectionInputFields', () => {
  describe('Schema validation', () => {
    it('should validate complete data', () => {
      const result = createConnectionInputFieldsSchema.safeParse({
        createConnectionData: {
          saveConnection: true,
          nameDesc: mockK8sNameDescriptionFieldData({ name: 'test' }),
        },
      });
      expect(result.success).toBe(true);
    });
    it('should reject incomplete data', () => {
      const result = createConnectionInputFieldsSchema.safeParse({
        createConnectionData: { saveConnection: true },
      });
      expect(result.success).toBe(false);
    });
  });
  describe('isValidCreateConnectionData', () => {
    it('should return true if the connection data is valid', () => {
      expect(
        isValidCreateConnectionData({
          saveConnection: true,
          nameDesc: mockK8sNameDescriptionFieldData({ name: 'test' }),
        }),
      ).toBe(true);
    });
    it('should return false if the connection data is invalid', () => {
      expect(isValidCreateConnectionData({ saveConnection: true })).toBe(false);
    });
  });
  describe('useCreateConnectionData hook', () => {
    it('should return the correct data', () => {
      const { result } = renderHook(() =>
        useCreateConnectionData(
          undefined,
          {
            saveConnection: true,
            nameDesc: mockK8sNameDescriptionFieldData(),
          },
          mockModelLocationData,
        ),
      );
      expect(result.current.data).toEqual({
        saveConnection: true,
        nameDesc: mockK8sNameDescriptionFieldData(),
      });
    });
    it('should initialize with saveConnection set to true', () => {
      const { result } = renderHook(() =>
        useCreateConnectionData(undefined, undefined, mockModelLocationData),
      );
      const { data } = result.current;
      expect(data).toEqual({ saveConnection: true });
    });
    it('should initialize with existing data', () => {
      const { result } = renderHook(() =>
        useCreateConnectionData(
          undefined,
          {
            saveConnection: true,
            nameDesc: mockK8sNameDescriptionFieldData(),
          },
          mockModelLocationData,
        ),
      );
      const { data } = result.current;
      expect(data).toEqual({ saveConnection: true, nameDesc: mockK8sNameDescriptionFieldData() });
    });
    it('should update the connection data', () => {
      const { result } = renderHook(() =>
        useCreateConnectionData(undefined, undefined, mockModelLocationData),
      );
      const { data, setData } = result.current;
      act(() => {
        setData({ saveConnection: true });
      });
      expect(data).toEqual({ saveConnection: true });
    });
    it('should update the connection data with existing data', () => {
      const { result } = renderHook(() =>
        useCreateConnectionData(
          undefined,
          {
            saveConnection: false,
          },
          mockModelLocationData,
        ),
      );
      act(() => {
        result.current.setData({ saveConnection: true });
      });
      expect(result.current.data).toEqual({ saveConnection: true });
    });
  });
  describe('Component', () => {
    const mockSetCreateConnectionData = jest.fn();
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should not render without model location data', () => {
      render(
        <CreateConnectionInputFields
          createConnectionData={{
            saveConnection: true,
            nameDesc: mockK8sNameDescriptionFieldData(),
          }}
          setCreateConnectionData={mockSetCreateConnectionData}
          projectName={undefined}
          modelLocationData={undefined}
        />,
      );
      expect(screen.queryByTestId('save-connection-checkbox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('save-connection-name-desc-name')).not.toBeInTheDocument();
    });
    it('should not render with model location data of type existing', () => {
      render(
        <CreateConnectionInputFields
          createConnectionData={{
            saveConnection: true,
            nameDesc: mockK8sNameDescriptionFieldData(),
          }}
          setCreateConnectionData={mockSetCreateConnectionData}
          projectName={undefined}
          modelLocationData={{ ...mockModelLocationData, type: ModelLocationType.EXISTING }}
        />,
      );
      expect(screen.queryByTestId('save-connection-checkbox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('save-connection-name-desc-name')).not.toBeInTheDocument();
    });
    it('should render with model location data', () => {
      render(
        <CreateConnectionInputFields
          createConnectionData={{
            saveConnection: true,
            nameDesc: mockK8sNameDescriptionFieldData(),
          }}
          setCreateConnectionData={mockSetCreateConnectionData}
          projectName={undefined}
          modelLocationData={mockModelLocationData}
        />,
      );
      expect(screen.getByTestId('save-connection-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('save-connection-checkbox')).toBeChecked();
      expect(screen.getByTestId('save-connection-name-desc-name')).toBeInTheDocument();
      expect(screen.getByTestId('save-connection-name-desc-name')).toHaveValue('');
    });
    it('should call setCreateConnectionData with the correct data when checkbox is clicked', async () => {
      render(
        <CreateConnectionInputFields
          createConnectionData={{
            saveConnection: true,
            nameDesc: mockK8sNameDescriptionFieldData(),
          }}
          setCreateConnectionData={mockSetCreateConnectionData}
          projectName={undefined}
          modelLocationData={mockModelLocationData}
        />,
      );
      const checkbox = screen.getByTestId('save-connection-checkbox');
      await act(async () => {
        fireEvent.click(checkbox);
      });
      expect(mockSetCreateConnectionData).toHaveBeenCalledWith({
        saveConnection: false,
        nameDesc: undefined,
      });
    });
    it('should call setCreateConnectionData with the correct data when name and description are changed', async () => {
      render(
        <CreateConnectionInputFields
          createConnectionData={{
            saveConnection: true,
            nameDesc: mockK8sNameDescriptionFieldData(),
          }}
          setCreateConnectionData={mockSetCreateConnectionData}
          projectName={undefined}
          modelLocationData={mockModelLocationData}
        />,
      );
      const nameInput = screen.getByTestId('save-connection-name-desc-name');
      const descriptionInput = screen.getByTestId('save-connection-name-desc-description');
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'test' } });
      });
      expect(mockSetCreateConnectionData).toHaveBeenCalledWith({
        nameDesc: {
          name: 'test',
          description: '',
          k8sName: {
            value: 'test',
            state: {
              immutable: false,
              invalidCharacters: false,
              invalidLength: false,
              maxLength: 253,
              touched: false,
              invalidCharsMessage: undefined,
              safePrefix: undefined,
              staticPrefix: undefined,
              regexp: undefined,
            },
          },
        },
        saveConnection: true,
      });
      await act(async () => {
        fireEvent.change(descriptionInput, { target: { value: 'test description' } });
      });
      expect(mockSetCreateConnectionData).toHaveBeenCalledWith({
        saveConnection: true,
        nameDesc: {
          name: 'test',
          description: 'test description',
          k8sName: {
            value: 'test',
            state: {
              immutable: false,
              invalidCharacters: false,
              invalidLength: false,
              maxLength: 253,
              touched: true,
              invalidCharsMessage: undefined,
              safePrefix: undefined,
              staticPrefix: undefined,
              regexp: undefined,
            },
          },
        },
      });
    });
  });
});
