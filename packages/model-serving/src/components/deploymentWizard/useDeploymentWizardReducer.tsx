import React from 'react';
import { isEqual } from 'lodash-es';
import type { ExternalDataMap } from './ExternalDataLoader';
import type {
  InitialWizardFormData,
  WizardField,
  WizardFormData,
  WizardStateOverrides,
} from './types';
import { getFieldDependencies, useActiveFields } from './dynamicFormUtils';

///// Field type stuff

export type WizardFormState = WizardFormData['state'];

////// Reducer stuff

type WizardFieldReducerState = {
  fieldValues: Record<string, unknown>;
  initialValues: Record<string, unknown>;
};

export type WizardFormAction<Field extends WizardField<unknown> = WizardField<unknown>> =
  | {
      type: 'setFieldData';
      payload: {
        id: string;
        data: unknown;
      };
    }
  | {
      type: 'clearFieldData';
      payload: {
        id: string;
      };
    }
  | {
      type: 'initFieldData';
      payload: {
        field: Field;
        existingFieldData?: unknown;
        externalData?: ReturnType<NonNullable<Field['externalDataHook']>>;
        dependencies?: Record<string, unknown>;
      };
    };

/**
 * The reducer manages field values alongside tracked initial values, enabling
 * dirty detection without external refs.
 *
 * - `setFieldData` — sets a field's UI state (marks it dirty vs its initial value)
 * - `clearFieldData` — removes a single field's state
 * - `initFieldData` — initializes a field's state (separately from `setFieldData` to avoid dirty detection)
 */
export const wizardFormReducer = (
  state: WizardFieldReducerState,
  action: WizardFormAction,
): WizardFieldReducerState => {
  switch (action.type) {
    case 'setFieldData':
      return {
        ...state,
        fieldValues: { ...state.fieldValues, [action.payload.id]: action.payload.data },
      };
    case 'clearFieldData': {
      const newFieldValues = { ...state.fieldValues };
      const newInitialValues = { ...state.initialValues };
      delete newFieldValues[action.payload.id];
      delete newInitialValues[action.payload.id];
      return { fieldValues: newFieldValues, initialValues: newInitialValues };
    }
    case 'initFieldData': {
      const { field, existingFieldData, externalData, dependencies } = action.payload;

      const initialValue = field.reducerFunctions.getInitialFieldData(
        existingFieldData,
        externalData?.data,
        dependencies ?? {},
      );
      return {
        ...state,
        initialValues: {
          ...state.initialValues,
          [field.id]: initialValue,
        },
      };
    }
    default:
      return state;
  }
};

///// Hooks

export type UseDeploymentWizardReducerResult = {
  state: WizardFormState;
  dispatch: React.Dispatch<WizardFormAction>;
  fields: WizardField<unknown>[];
  externalDataLoaded: boolean;
  computedOverrides: WizardStateOverrides;
};

/**
 * Hook that manages dynamic wizard field state from extensions.
 *
 * The state flow is:
 * - `fields` is computed from the merged `formState` and returns the `isActive` fields
 * - External data is loaded for active fields (via ExternalDataLoader)
 *   - Mounts a dynamic hook via HookNotify
 * - When field is initialized, initFieldData calculates the initial value based on its dependencies and external data
 * - When a field's dependencies change, initFieldData is called again to recalculate the initial value
 *   - This is done with a prevRef to the formState to compare dependencies
 * - When a field is removed from the form, clearFieldData is called to remove the field's state
 *
 * @param formState - Reducer state + field hooks state
 * @param dispatch - Dispatch function from the reducer
 * @param initialData - Initial data for pre-populating fields (e.g., when editing an existing deployment)
 * @param externalDataMap - External data loaded by ExternalDataLoader
 */
export const useDeploymentWizardReducer = (
  formState: WizardFormState,
  dispatch: React.Dispatch<WizardFormAction>,
  initialData?: InitialWizardFormData,
  externalDataMap: ExternalDataMap = {},
): UseDeploymentWizardReducerResult => {
  const mergedStateRef = React.useRef(formState);
  mergedStateRef.current = formState;

  const activeFields = useActiveFields(formState);

  // Makes it easier for callers to use init dispatch without needing entire merged state
  const enhancedDispatch: React.Dispatch<WizardFormAction> = React.useCallback(
    (action) => {
      if (action.type === 'initFieldData') {
        const { field } = action.payload;
        dispatch({
          ...action,
          payload: {
            ...action.payload,
            existingFieldData: action.payload.existingFieldData ?? initialData?.[field.id],
            dependencies:
              action.payload.dependencies ?? getFieldDependencies(field, mergedStateRef.current),
          },
        });
      } else {
        dispatch(action);
      }
    },
    [dispatch, initialData],
  );

  const prevActiveFields = React.useRef<WizardField<unknown>[]>([]);
  const prevMergedState = React.useRef<WizardFormState>(formState);

  React.useEffect(() => {
    for (const field of activeFields) {
      const isNew = !prevActiveFields.current.some((f) => f.id === field.id);

      const dependencies = getFieldDependencies(field, formState);
      const prevDependencies = getFieldDependencies(field, prevMergedState.current);
      const isDependenciesChanged = !isEqual(dependencies, prevDependencies);

      if (isNew || isDependenciesChanged) {
        if (isDependenciesChanged && field.shouldResetOnDependencyChange) {
          dispatch({ type: 'clearFieldData', payload: { id: field.id } });
        }
        dispatch({
          type: 'initFieldData',
          payload: {
            field,
            existingFieldData: initialData?.[field.id],
            externalData: field.id in externalDataMap ? externalDataMap[field.id] : undefined,
            dependencies,
          },
        });
      }
    }

    for (const prevField of prevActiveFields.current) {
      const isGone = !activeFields.some((f) => f.id === prevField.id);
      if (isGone) {
        dispatch({ type: 'clearFieldData', payload: { id: prevField.id } });
      }
    }

    prevActiveFields.current = activeFields;
    prevMergedState.current = formState;
  }, [activeFields, dispatch, externalDataMap, initialData, formState]);

  const computedOverrides = React.useMemo((): WizardStateOverrides => {
    let overrides: WizardStateOverrides = {};
    for (const field of activeFields) {
      const storedValue: unknown = formState[field.id];
      if (storedValue == null) {
        continue;
      }
      const effectiveValue: unknown =
        field.reducerFunctions.getFieldData?.(storedValue, formState) ?? storedValue;
      const fieldOverrides = field.reducerFunctions.getFieldOverrides?.(effectiveValue, formState);
      if (fieldOverrides) {
        overrides = { ...overrides, ...fieldOverrides };
      }
    }
    return overrides;
  }, [activeFields, formState]);

  return React.useMemo(
    () => ({
      state: formState,
      dispatch: enhancedDispatch,
      fields: activeFields,
      externalDataLoaded: true,
      computedOverrides,
    }),
    [formState, enhancedDispatch, activeFields, computedOverrides],
  );
};
