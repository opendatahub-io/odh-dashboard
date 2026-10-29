type FieldDataDebugAction =
  | { type: 'setFieldData' | 'initFieldData'; id: string; value: unknown }
  | { type: 'clearFieldData'; id: string }
  | { type: 'reInitForm' };

const fieldDataDebugStyles: Record<FieldDataDebugAction['type'], string> = {
  setFieldData: 'color: #2563eb; font-weight: bold',
  clearFieldData: 'color: #dc2626; font-weight: bold',
  initFieldData: 'color: #15803d; font-weight: bold',
  reInitForm: 'color: #fcd200; font-weight: bold',
};

export const debugFieldDataAction = (action: FieldDataDebugAction): void => {
  // eslint-disable-next-line no-console
  console.debug(
    `%c${action.type}:%c`,
    fieldDataDebugStyles[action.type],
    '',
    ...('id' in action ? [action.id] : []),
    ...('value' in action ? ['->', action.value] : []),
  );
};
