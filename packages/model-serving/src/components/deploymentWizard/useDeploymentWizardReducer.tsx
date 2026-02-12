import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { ExternalDataMap } from './ExternalDataLoader';
import type { InitialWizardFormData, WizardField, WizardFormData } from './types';
import { isWizardField2Extension } from '../../../extension-points';

///// Field type stuff

export type WizardFormState = WizardFormData['state'];

////// Reducer stuff

export type WizardFormAction =
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
    };

/** The reducer provides consistent behavior for interacting with the wizard for state management.
 * - `setFieldData` sets a field's UI state
 * - `clearFieldData` clears a field's UI state (like for unloading a field when it is no longer needed)
 **/
export const wizardFormReducer = (
  state: Record<string, unknown>,
  action: WizardFormAction,
): Record<string, unknown> => {
  switch (action.type) {
    case 'setFieldData':
      return { ...state, [action.payload.id]: action.payload.data };
    case 'clearFieldData': {
      const newState = { ...state };
      delete newState[action.payload.id];
      return newState;
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
 * Hook that manages dynamic wizard field state.
 *
 * The state flow is:
 * 1. `baseFormState` (from legacy hooks) is merged with `reducerState` (dynamic fields)
 * 2. `activeFields` is computed from the merged state
 * 3. External data is loaded for active fields (via ExternalDataLoader)
 * 4. Fields are initialized once their external data is ready
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
  const [extensions] = useResolvedExtensions(isWizardField2Extension);

  const [reducerState, dispatch] = React.useReducer(wizardFormReducer, {});
  const mergedState: WizardFormState = React.useMemo(
    () => ({ ...baseFormState, ...reducerState }),
    [baseFormState, reducerState],
  );

  const activeFields: WizardField[] = React.useMemo(() => {
    return extensions
      .filter((ext) => ext.properties.field.isActive(mergedState))
      .map((ext) => ext.properties.field);
  }, [extensions, mergedState]);

  const previousFields = React.useRef<WizardField<unknown>[]>([]);
  React.useEffect(() => {
    for (const field of activeFields) {
      const isNewField = !previousFields.current.find((f) => f.id === field.id);

      if (isNewField) {
        const extractedData = initialData?.[field.id];
        const externalData =
          field.id in externalDataMap ? externalDataMap[field.id].data : undefined;
        // The getInitialFieldData function accepts optional initial data and external data
        const fieldInitialData = field.reducerFunctions.getInitialFieldData(
          extractedData,
          externalData,
        );
        dispatch({
          type: 'setFieldData',
          payload: { id: field.id, data: fieldInitialData },
        });
      }
    }

    // Clear fields that are no longer active
    for (const field of previousFields.current) {
      const isDisposed = !activeFields.find((f) => f.id === field.id);
      if (isDisposed) {
        dispatch({
          type: 'clearFieldData',
          payload: { id: field.id },
        });
      }
    }
    previousFields.current = activeFields;
  }, [activeFields, dispatch, externalDataMap, initialData]);

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
