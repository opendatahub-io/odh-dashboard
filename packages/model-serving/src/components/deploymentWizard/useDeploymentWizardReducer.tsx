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
 * - `baseFormState` (from legacy hooks) is merged with `reducerState` (dynamic fields)
 * - `activeFields` is computed from the merged state
 * - External data is loaded for active fields (via ExternalDataLoader)
 *   - Mounts a dynamic hook via HookNotify
 * - Field's initial values are separated from the field values (to avoid dirty detection)
 *   - If only initial value exist, it's not dirty. If field value exists, it's dirty.
 *   - Initial value calculated by its dependencies (`getFieldDependencies`) or external data (`externalDataMap[field.id]`)
 *
 * @param baseFormState - State from the legacy individual field hooks
 * @param initialData - Initial data for pre-populating fields (e.g., when editing)
 * @param externalDataMap - External data loaded by ExternalDataLoader
 */
export const useDeploymentWizardReducer = (
  baseFormState: WizardFormState,
  initialData?: InitialWizardFormData,
  externalDataMap: ExternalDataMap = {},
): UseDeploymentWizardReducerResult => {
  const [reducerState, dispatch] = React.useReducer(wizardFormReducer, {
    fieldValues: {},
    initialValues: {},
  });
  const mergedState: WizardFormState = React.useMemo(
    () => ({ ...baseFormState, ...reducerState.initialValues, ...reducerState.fieldValues }),
    [baseFormState, reducerState.initialValues, reducerState.fieldValues],
  );
  const mergedStateRef = React.useRef(mergedState);
  mergedStateRef.current = mergedState;

  const activeFields = useActiveFields(mergedState);

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
  const prevMergedState = React.useRef<WizardFormState>(mergedState);

  React.useEffect(() => {
    for (const field of activeFields) {
      const isNew = !prevActiveFields.current.some((f) => f.id === field.id);

      const dependencies = getFieldDependencies(field, mergedState);
      const prevDependencies = getFieldDependencies(field, prevMergedState.current);
      const isDependenciesChanged = !isEqual(dependencies, prevDependencies);

      if (isNew || isDependenciesChanged) {
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
    prevMergedState.current = mergedState;
  }, [activeFields, dispatch, externalDataMap, initialData, mergedState]);

  const computedOverrides = React.useMemo((): WizardStateOverrides => {
    let overrides: WizardStateOverrides = {};
    for (const field of activeFields) {
      const storedValue: unknown = mergedState[field.id];
      if (storedValue == null) {
        continue;
      }
      const effectiveValue: unknown =
        field.reducerFunctions.getFieldData?.(storedValue, mergedState) ?? storedValue;
      const fieldOverrides = field.reducerFunctions.getFieldOverrides?.(
        effectiveValue,
        mergedState,
      );
      if (fieldOverrides) {
        overrides = { ...overrides, ...fieldOverrides };
      }
    }
    return overrides;
  }, [activeFields, mergedState]);

  return React.useMemo(
    () => ({
      state: mergedState,
      dispatch: enhancedDispatch,
      fields: activeFields,
      externalDataLoaded: true,
      computedOverrides,
    }),
    [mergedState, enhancedDispatch, activeFields, computedOverrides],
  );
};
