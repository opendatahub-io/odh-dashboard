import { z } from 'zod';
import { renderHook, act } from '@testing-library/react';
import { useZodFormValidation } from '#~/hooks/useZodFormValidation';

const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be at least 18'),
});

type TestData = z.infer<typeof testSchema>;

describe('useZodFormValidation', () => {
  const validData: TestData = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 25,
  };

  const invalidData: TestData = {
    name: '',
    email: 'invalid-email',
    age: 16,
  };

  describe('basic functionality', () => {
    it('should return validation functions', () => {
      const { result } = renderHook(() => useZodFormValidation(validData, testSchema));

      expect(result.current.markFieldTouched).toBeInstanceOf(Function);
      expect(result.current.getFieldValidation).toBeInstanceOf(Function);
      expect(result.current.getFieldValidationProps).toBeInstanceOf(Function);
    });

    it('should return no validation errors for valid data', () => {
      const { result } = renderHook(() => useZodFormValidation(validData, testSchema));

      act(() => {
        result.current.markFieldTouched(['name']);
      });

      const validation = result.current.getFieldValidation(['name']);
      expect(validation).toHaveLength(0);
    });

    it('should return validation errors for invalid data when field is touched', () => {
      const { result } = renderHook(() => useZodFormValidation(invalidData, testSchema));

      act(() => {
        result.current.markFieldTouched(['name']);
      });

      const validation = result.current.getFieldValidation(['name']);
      expect(validation).toHaveLength(1);
      expect(validation[0].message).toBe('Name is required');
    });

    it('should not return validation errors for untouched fields', () => {
      const { result } = renderHook(() => useZodFormValidation(invalidData, testSchema));

      const validation = result.current.getFieldValidation(['name']);
      expect(validation).toHaveLength(0);
    });

    it('should return validation props with error state when field has errors', () => {
      const { result } = renderHook(() => useZodFormValidation(invalidData, testSchema));

      act(() => {
        result.current.markFieldTouched(['email']);
      });

      const props = result.current.getFieldValidationProps(['email']);
      expect(props.validated).toBe('error');
      expect(props.onBlur).toBeInstanceOf(Function);
    });

    it('should return validation props with default state when field has no errors', () => {
      const { result } = renderHook(() => useZodFormValidation(validData, testSchema));

      act(() => {
        result.current.markFieldTouched(['name']);
      });

      const props = result.current.getFieldValidationProps(['name']);
      expect(props.validated).toBe('default');
    });

    it('should mark field as touched when onBlur is called', () => {
      const { result } = renderHook(() => useZodFormValidation(invalidData, testSchema));

      const props = result.current.getFieldValidationProps(['name']);

      act(() => {
        props.onBlur();
      });

      const validation = result.current.getFieldValidation(['name']);
      expect(validation).toHaveLength(1);
    });
  });

  describe('ignoreTouchedFields option', () => {
    it('should return validation errors immediately when ignoreTouchedFields is true', () => {
      const { result } = renderHook(() =>
        useZodFormValidation(invalidData, testSchema, { ignoreTouchedFields: true }),
      );

      const validation = result.current.getFieldValidation(['name']);
      expect(validation).toHaveLength(1);
      expect(validation[0].message).toBe('Name is required');
    });

    it('should return all field errors when ignoreTouchedFields is true', () => {
      const { result } = renderHook(() =>
        useZodFormValidation(invalidData, testSchema, { ignoreTouchedFields: true }),
      );

      const nameValidation = result.current.getFieldValidation(['name']);
      const emailValidation = result.current.getFieldValidation(['email']);
      const ageValidation = result.current.getFieldValidation(['age']);

      expect(nameValidation).toHaveLength(1);
      expect(emailValidation).toHaveLength(1);
      expect(ageValidation).toHaveLength(1);
    });

    it('should return error validation props immediately when ignoreTouchedFields is true', () => {
      const { result } = renderHook(() =>
        useZodFormValidation(invalidData, testSchema, { ignoreTouchedFields: true }),
      );

      const props = result.current.getFieldValidationProps(['name']);
      expect(props.validated).toBe('error');
    });

    it('should still respect touched fields when ignoreTouchedFields is false', () => {
      const { result } = renderHook(() =>
        useZodFormValidation(invalidData, testSchema, { ignoreTouchedFields: false }),
      );

      const validation = result.current.getFieldValidation(['name']);
      expect(validation).toHaveLength(0);

      act(() => {
        result.current.markFieldTouched(['name']);
      });

      const validationAfterTouch = result.current.getFieldValidation(['name']);
      expect(validationAfterTouch).toHaveLength(1);
    });

    it('should override touched state when ignoreTouchedFields is true', () => {
      const { result } = renderHook(() =>
        useZodFormValidation(invalidData, testSchema, { ignoreTouchedFields: true }),
      );

      // Even without marking as touched, should return errors
      const validation = result.current.getFieldValidation(['name']);
      expect(validation).toHaveLength(1);

      // Marking as touched should not change the behavior
      act(() => {
        result.current.markFieldTouched(['name']);
      });

      const validationAfterTouch = result.current.getFieldValidation(['name']);
      expect(validationAfterTouch).toHaveLength(1);
    });
  });

  describe('field path handling', () => {
    it('should handle nested field paths', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1, 'Name is required'),
          }),
        }),
      });

      const nestedData = {
        user: {
          profile: {
            name: '',
          },
        },
      };

      const { result } = renderHook(() =>
        useZodFormValidation(nestedData, nestedSchema, { ignoreTouchedFields: true }),
      );

      const validation = result.current.getFieldValidation(['user', 'profile', 'name']);
      expect(validation).toHaveLength(1);
      expect(validation[0].message).toBe('Name is required');
    });

    it('should handle root level validation', () => {
      const { result } = renderHook(() =>
        useZodFormValidation(invalidData, testSchema, { ignoreTouchedFields: true }),
      );

      const validation = result.current.getFieldValidation();
      expect(validation.length).toBeGreaterThan(0);
    });
  });

  describe('dynamic data updates', () => {
    it('should update validation when data changes', () => {
      const { result, rerender } = renderHook(
        ({ data }) => useZodFormValidation(data, testSchema, { ignoreTouchedFields: true }),
        {
          initialProps: { data: invalidData },
        },
      );

      const initialValidation = result.current.getFieldValidation(['name']);
      expect(initialValidation).toHaveLength(1);

      rerender({ data: validData });

      const updatedValidation = result.current.getFieldValidation(['name']);
      expect(updatedValidation).toHaveLength(0);
    });
  });
});
