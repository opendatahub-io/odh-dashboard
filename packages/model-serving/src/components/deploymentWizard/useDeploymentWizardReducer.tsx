import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
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
  state: WizardFormState,
  action: WizardFormAction,
): WizardFormState => {
  switch (action.type) {
    case 'setFieldData':
      return { ...state, [action.payload.id]: action.payload.data };
    case 'clearFieldData':
      return { ...state, [action.payload.id]: undefined };
    default:
      return state;
  }
};

///// Hook

export type UseDeploymentWizardReducerResult = {
  state: WizardFormState;
  dispatch: React.Dispatch<WizardFormAction>;
  fields: WizardField<unknown>[];
};

export const useDeploymentWizardReducer = (
  wizardFormState: WizardFormState,
  initialData?: InitialWizardFormData,
): UseDeploymentWizardReducerResult => {
  const [extensions] = useResolvedExtensions(isWizardField2Extension);

  const [state, dispatch] = React.useReducer(wizardFormReducer, wizardFormState);

  const activeFields: WizardField[] = React.useMemo(() => {
    return extensions
      .filter((ext) => ext.properties.field.isActive(wizardFormState))
      .map((ext) => ext.properties.field);
  }, [extensions, wizardFormState]);

  const previousFields = React.useRef<WizardField[]>([]);
  React.useEffect(() => {
    // set initial value of newly loaded field
    for (const field of activeFields) {
      if (!previousFields.current.find((f) => f.id === field.id)) {
        // Use extracted data from initialData if available (keyed by field.id), otherwise use field's default
        const extractedData = initialData?.[field.id];
        // The getInitialFieldData function accepts optional initial data of the field's type
        // Since we're dealing with unknown types from dynamic fields, we pass the extracted data directly
        const fieldInitialData = field.reducerStuff.getInitialFieldData(extractedData);
        dispatch({
          type: 'setFieldData',
          payload: { id: field.id, data: fieldInitialData },
        });
      }
    }
    // clear fields that are no longer active
    for (const field of previousFields.current) {
      if (!activeFields.find((f) => f.id === field.id)) {
        dispatch({
          type: 'clearFieldData',
          payload: { id: field.id },
        });
      }
    }
    previousFields.current = activeFields;
    // Note: initialData is intentionally excluded from deps to only use it on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFields, dispatch]);

  return React.useMemo(
    () => ({ state: { ...state, ...wizardFormState }, dispatch, fields: activeFields }),
    [state, activeFields, wizardFormState],
  );
};
