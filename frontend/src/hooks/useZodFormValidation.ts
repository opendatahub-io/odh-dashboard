import { ValidatedOptions } from '@patternfly/react-core';
import { useState } from 'react';
import { ZodIssue, ZodType } from 'zod';
import { useValidation } from '#~/utilities/useValidation';

export type FieldValidationProps = {
  validated: ValidatedOptions.error | ValidatedOptions.default;
  onBlur: () => void;
};

/**
 * This hook is used to validate sections separately in a form. In that way, the logic to render the validation error message
 * and the way to trigger it could be customized and better controlled within the component scope.
 *
 * Example: const { markFieldTouched, getFieldValidation, getFieldValidationProps } = useZodValidation(dataToValidate, zodSchemaToValidateData)
 * - markFieldTouched: When the field is never touched (e.g. It's the first time you enter the form), we don't want to show the error message even if there is a validation error (e.g. empty field).
 * Thus, we call this function in the component when the field is first touched. For example, we can set it to `onBlur` callback to an input element, because once an input field is focused and loses
 * focus, it can be treated as "touched". We can safely show the validation error message in that situation. Different HTML elements should be treated differently, so this function needs to be used wisely
 * according to the element it's validating
 * - getFieldValidation: This will return a list of `ZodIssue` for a specific path, then it can be rendered in `<ZodErrorHelperText>` under the field to show the error message when there is an error
 * - getFieldValidationProps: Most of the fields we are validating are PF `TextInput`, this will return an object with 2 props that could be helpful to set the validation-related props to the `TextInput`.
 * To use it, simply map them to the component that takes the props
 *   - validated: If there are validation errors in the field, it returns `ValidatedOptions.error`. Otherwise, it returns `ValidatedOptions.default`
 *   - onBlur: For text input fields, this helps to easier mark the field as touched
 *
 * From the large form scope, it just needs to get the form schema and get the validation result to enable/disable the submit button. The specific validation logic will be handled in every component/section.
 */

export function useZodFormValidation<T>(
  data: T,
  schema: ZodType<T>,
  options?: {
    ignoreTouchedFields?: boolean;
  },
): {
  markFieldTouched: (fieldPath?: (string | number)[]) => void;
  getFieldValidation: (
    fieldPath?: (string | number)[],
    ignoreTouchedFields?: boolean,
  ) => ZodIssue[];
  getFieldValidationProps: (fieldPath?: (string | number)[]) => FieldValidationProps;
} {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const { getAllValidationIssues } = useValidation(data, schema);

  const markFieldTouched = (fieldPath?: (string | number)[]) => {
    const key = fieldPath ? fieldPath.join('.') : '/';
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
  };

  const getFieldValidation = (
    fieldPath?: (string | number)[],
    ignoreTouchedFields?: boolean,
  ): ZodIssue[] => {
    const key = fieldPath ? fieldPath.join('.') : '/';
    const issues = getAllValidationIssues(fieldPath);
    if (touchedFields[key] || options?.ignoreTouchedFields || ignoreTouchedFields) {
      return issues;
    }
    return [];
  };

  const getFieldValidationProps = (fieldPath?: (string | number)[]): FieldValidationProps => {
    const issues = getFieldValidation(fieldPath);
    return {
      validated: issues.length > 0 ? ValidatedOptions.error : ValidatedOptions.default,
      onBlur: () => markFieldTouched(fieldPath),
    };
  };

  return { markFieldTouched, getFieldValidation, getFieldValidationProps };
}
