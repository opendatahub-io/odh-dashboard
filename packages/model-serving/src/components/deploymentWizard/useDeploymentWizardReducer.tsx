import React from 'react';
import { isEqual } from 'lodash-es';
import type { ExternalDataMap } from './ExternalDataLoader';
import type { InitialWizardFormData, WizardField, WizardFormData } from './types';
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

  const activeFields = useActiveFields(mergedState);

  const prevActiveFields = React.useRef<WizardField<unknown>[]>(activeFields);
  const prevExternalData = React.useRef<ExternalDataMap>(externalDataMap);

  const prevMergedState = React.useRef<WizardFormState>(mergedState);

  React.useEffect(() => {
    for (const field of activeFields) {
      const isNew = !prevActiveFields.current.some((f) => f.id === field.id);

      const isLoaded =
        field.id in prevExternalData.current &&
        prevExternalData.current[field.id].loaded === false &&
        field.id in externalDataMap &&
        externalDataMap[field.id].loaded === true;

      // This should be done in the reducer but not all fields from baseFormState trigger dispatches
      const dependencies = getFieldDependencies(field, mergedState);
      const prevDependencies = getFieldDependencies(field, prevMergedState.current);
      const isDepdendenciesChanged = !isEqual(dependencies, prevDependencies);

      if (isNew || isLoaded || isDepdendenciesChanged) {
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
    prevExternalData.current = externalDataMap;
    prevMergedState.current = mergedState;
  }, [activeFields, dispatch, externalDataMap, initialData, mergedState]);

  return React.useMemo(
    () => ({
      state: mergedState,
      dispatch,
      fields: activeFields,
      externalDataLoaded: true,
    }),
    [mergedState, activeFields],
  );
};
