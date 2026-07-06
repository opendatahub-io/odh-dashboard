import * as React from 'react';
import { z } from 'zod';

const isObjectSchema = <T>(
  schema: z.ZodType<T>,
): schema is z.ZodObject<z.ZodRawShape, 'strip', z.ZodTypeAny, T, T> => 'shape' in schema;

/*
  A hook to be used in conjunction with simple object states such as useGenericObjectState
  to provide validation results for the data.

  If the schema is an object schema, only the changed properties will be validated to be more efficient.
  Otherwise, the entire schema will be validated for any change to data.
*/
export const useValidation = <T>(data: T, schema: z.ZodType<T>): ValidationContextType<T> => {
  const schemaRef = React.useRef(schema);
  const prevDataRef = React.useRef<T>(data);
  const resultRef = React.useRef<Omit<z.SafeParseReturnType<T, T>, 'data'>>();

  resultRef.current = React.useMemo(() => {
    // Validate the entire schema on first pass, or if it's not an object schema or if the schema has changed.
    if (!isObjectSchema(schema) || resultRef.current == null || schemaRef.current !== schema) {
      schemaRef.current = schema;
      return schema.safeParse(data);
    }

    // Only validate the changed properties related to the object shape schema and merge the result.
    let newResult = resultRef.current;
    for (const key in data) {
      if (prevDataRef.current[key] !== data[key]) {
        const partialResult = schema.shape[key].safeParse(data[key], { path: [key] });
        if (partialResult.error) {
          if (newResult.error) {
            newResult = {
              error: new z.ZodError<T>([
                ...newResult.error.issues.filter((issue) => issue.path[0] !== key),
                ...partialResult.error.issues,
              ]),
              success: false,
            };
          } else {
            newResult = {
              error: partialResult.error,
              success: false,
            };
          }
        } else if (newResult.error) {
          const issues = newResult.error.issues.filter((issue) => issue.path[0] !== key);
          if (issues.length === 0) {
            newResult = {
              error: undefined,
              success: true,
            };
          } else {
            newResult = {
              error: new z.ZodError<T>(issues),
              success: false,
            };
          }
        }
      }
    }
    return newResult;
  }, [data, schema]);

  prevDataRef.current = data;

  const getValidationIssue = React.useCallback((path: (string | number)[], code: string) => {
    const error = resultRef.current?.error;
    if (!error) {
      return undefined;
    }
    return error.issues.find(
      (issue) =>
        issue.path.join('.') === path.join('.') &&
        // compare custom codes stored in `params.code`
        (issue.code === code || (issue.code === 'custom' && issue.params?.code === code)),
    );
  }, []);

  const getAllValidationIssues = React.useCallback((path?: (string | number)[]) => {
    const error = resultRef.current?.error;
    if (!error) {
      return [];
    }
    return error.issues.filter((issue) => (path ? issue.path.join('.') === path.join('.') : true));
  }, []);

  const hasValidationIssue = React.useCallback(
    (path: (string | number)[], code: string) => getValidationIssue(path, code) !== undefined,
    [getValidationIssue],
  );

  return {
    validationResult: resultRef.current,
    getValidationIssue,
    hasValidationIssue,
    getAllValidationIssues,
  };
};

export type ValidationContextType<T = unknown> = {
  validationResult: Omit<z.SafeParseReturnType<T, T>, 'data'>;
  getValidationIssue: (path: (string | number)[], code: string) => z.ZodIssue | undefined;
  hasValidationIssue: (path: (string | number)[], code: string) => boolean;
  getAllValidationIssues: (path?: (string | number)[]) => z.ZodIssue[];
};

export const ValidationContext = React.createContext<ValidationContextType>({
  validationResult: { error: undefined, success: true },
  getValidationIssue: () => undefined,
  hasValidationIssue: () => false,
  getAllValidationIssues: () => [],
});
