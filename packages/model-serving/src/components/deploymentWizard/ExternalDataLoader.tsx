import React from 'react';
import { HookNotify } from '@odh-dashboard/plugin-core';
import type { InitialWizardFormData, WizardField } from './types';

export type ExternalDataMap = Record<string, { loaded: boolean; loadError?: Error; data: unknown }>;

type ExternalDataLoaderProps = {
  fields: WizardField<unknown, unknown>[];
  initialData?: InitialWizardFormData;
  setExternalData: React.Dispatch<React.SetStateAction<ExternalDataMap>>;
};

/**
 * Renders HookNotify components for each field that has an externalDataHook.
 * This ensures hooks are called consistently regardless of wizard step navigation.
 * The component itself renders nothing visible.
 */
export const ExternalDataLoader: React.FC<ExternalDataLoaderProps> = ({
  fields,
  initialData,
  setExternalData,
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
              setExternalData={setExternalData}
            />
          );
        }
        return null;
      })}
    </>
  );
};

const ExternalDataHookNotify: React.FC<{
  field: WizardField<unknown, unknown>;
  initialData?: InitialWizardFormData;
  setExternalData: React.Dispatch<React.SetStateAction<ExternalDataMap>>;
}> = ({ field, initialData, setExternalData }) => {
  const hook = React.useMemo(() => field.externalDataHook, [field.externalDataHook]);

  const hookArgs: [InitialWizardFormData | undefined] = React.useMemo(
    () => [initialData],
    [initialData],
  );

  const onDataChange = React.useCallback(
    (data: { loaded: boolean; loadError?: Error; data: unknown } | undefined) => {
      if (data) {
        setExternalData((prev) => {
          const existing = field.id in prev ? prev[field.id] : undefined;
          // Skip update if loaded state and data reference are the same to avoid infinite re-renders
          if (
            existing !== undefined &&
            existing.loaded === data.loaded &&
            existing.data === data.data
          ) {
            return prev;
          }
          return { ...prev, [field.id]: data };
        });
      }
    },
    [field.id, setExternalData],
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
