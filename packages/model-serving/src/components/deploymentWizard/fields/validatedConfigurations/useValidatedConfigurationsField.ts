import React from 'react';

export type ValidatedConfigurationsFieldHook = {
  selectedValidatedConfigurations: Record<string, string[]>;
  toggleOption: (forField: string, optionValue: string, checked: boolean) => void;
  isOptionSelected: (forField: string, optionValue: string) => boolean;
};

export const useValidatedConfigurationsField = (
  initialSelected?: Record<string, string[]>,
): ValidatedConfigurationsFieldHook => {
  const [selectedValidatedConfigurations, setSelectedValidatedConfigurations] = React.useState<
    Record<string, string[]>
  >(initialSelected ?? {});

  const toggleOption = React.useCallback(
    (forField: string, optionValue: string, checked: boolean) => {
      setSelectedValidatedConfigurations((prev) => {
        const current = prev[forField] ?? [];
        const nextValues = checked
          ? current.includes(optionValue)
            ? current
            : [...current, optionValue]
          : current.filter((value) => value !== optionValue);

        return {
          ...prev,
          [forField]: nextValues,
        };
      });
    },
    [],
  );

  const selectedSet = React.useMemo(() => {
    const result: Partial<Record<string, Set<string>>> = {};
    Object.entries(selectedValidatedConfigurations).forEach(([field, values]) => {
      result[field] = new Set(values);
    });
    return result;
  }, [selectedValidatedConfigurations]);

  const isOptionSelected = React.useCallback(
    (forField: string, optionValue: string) => selectedSet[forField]?.has(optionValue) ?? false,
    [selectedSet],
  );

  return {
    selectedValidatedConfigurations,
    toggleOption,
    isOptionSelected,
  };
};
