import React from 'react';
import { HookNotify } from '@odh-dashboard/plugin-core';
import { WizardFormAction, WizardFormState } from './useDeploymentWizardReducer';
import { getFieldDependencies } from './dynamicFormUtils';
import type { InitialWizardFormData, WizardField } from '../../shared/types/form-data';

export type ExternalDataMap = Record<string, { loaded: boolean; loadError?: Error; data: unknown }>;

/**
 * The map only holds entries for active fields (removed on unmount), so every entry must be
 * settled before the form data derived from it can be deployed.
 */
export const isExternalDataReady = (externalData: ExternalDataMap): boolean =>
  Object.values(externalData).every((entry) => entry.loaded || entry.loadError);

type ExternalDataLoaderProps = {
  fields: WizardField<unknown, unknown>[];
  initialData?: InitialWizardFormData;
  formState: WizardFormState;
  setExternalData: React.Dispatch<React.SetStateAction<ExternalDataMap>>;
  dispatch: React.Dispatch<WizardFormAction>;
};

/**
 * Renders HookNotify components for each field that has an externalDataHook.
 * This ensures hooks are called consistently regardless of wizard step navigation.
 * The component itself renders nothing visible.
 */
export const ExternalDataLoader: React.FC<ExternalDataLoaderProps> = ({
  fields,
  initialData,
  formState,
  setExternalData,
  dispatch,
}) => {
  return (
    <>
      {fields.map((f) => {
        if (f.externalDataHook) {
          return (
            <ExternalDataHookNotify
              key={f.id}
              field={f}
              initialData={initialData}
              formState={formState}
              setExternalData={setExternalData}
              dispatch={dispatch}
            />
          );
        }
        return null;
      })}
    </>
  );
};

const ExternalDataHookNotify: React.FC<{
  field: WizardField;
  initialData?: InitialWizardFormData;
  formState: WizardFormState;
  setExternalData: React.Dispatch<React.SetStateAction<ExternalDataMap>>;
  dispatch: React.Dispatch<WizardFormAction>;
}> = ({ field, initialData, formState, setExternalData, dispatch }) => {
  const hook = React.useMemo(() => field.externalDataHook, [field.externalDataHook]);

  const dependencies = React.useMemo(
    () => getFieldDependencies(field, formState, initialData),
    [field, formState, initialData],
  );
  const hookArgs: Parameters<NonNullable<WizardField['externalDataHook']>> = React.useMemo(
    () => [dependencies],
    [dependencies],
  );

  const prevLoadedRef = React.useRef<boolean | undefined>(undefined);

  const onDataChange = React.useCallback(
    (data: { loaded: boolean; loadError?: Error; data: unknown } | undefined) => {
      if (data) {
        const wasLoaded = prevLoadedRef.current;
        prevLoadedRef.current = data.loaded;

        setExternalData((prev) => {
          const existing = field.id in prev ? prev[field.id] : undefined;
          if (
            existing !== undefined &&
            existing.loaded === data.loaded &&
            existing.data === data.data &&
            existing.loadError === data.loadError
          ) {
            return prev;
          }
          return { ...prev, [field.id]: data };
        });

        if (wasLoaded === false && data.loaded === true) {
          dispatch({
            type: 'initFieldData',
            payload: { field, externalData: data },
          });
        }
      }
    },
    [setExternalData, dispatch, field],
  );

  const onUnmount = React.useCallback(() => {
    setExternalData((prev) => {
      const next = { ...prev };
      delete next[field.id];
      return next;
    });
  }, [field.id, setExternalData]);

  if (!hook) {
    return null;
  }

  return (
    <HookNotify
      key={field.id}
      useHook={hook}
      args={hookArgs}
      onNotify={onDataChange}
      onUnmount={onUnmount}
    />
  );
};
