import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { Event, Execution, Value as MlmdValue } from '#~/third_party/mlmd';

export type MlmdMetadataValueType = string | number | Struct | undefined;

export const getExecutionDisplayName = (execution?: Execution | null): string =>
  execution?.getCustomPropertiesMap().get('display_name')?.getStringValue() || '(No name)';

export const getMlmdMetadataValue = (value?: MlmdValue): MlmdMetadataValueType => {
  if (!value) {
    return '';
  }

  switch (value.getValueCase()) {
    case MlmdValue.ValueCase.DOUBLE_VALUE:
      return value.getDoubleValue();
    case MlmdValue.ValueCase.INT_VALUE:
      return value.getIntValue();
    case MlmdValue.ValueCase.STRING_VALUE:
      return value.getStringValue();
    case MlmdValue.ValueCase.STRUCT_VALUE:
      return value.getStructValue();
    default:
      return '';
  }
};

export const getOriginalExecutionId = (execution: Execution | null): string | undefined =>
  execution?.getCustomPropertiesMap().get('cached_execution_id')?.getStringValue();

export const parseEventsByType = (response: Event[] | null): Record<Event.Type, Event[]> => {
  const events: Record<Event.Type, Event[]> = {
    [Event.Type.UNKNOWN]: [],
    [Event.Type.DECLARED_INPUT]: [],
    [Event.Type.INPUT]: [],
    [Event.Type.DECLARED_OUTPUT]: [],
    [Event.Type.OUTPUT]: [],
    [Event.Type.INTERNAL_INPUT]: [],
    [Event.Type.INTERNAL_OUTPUT]: [],
    [Event.Type.PENDING_OUTPUT]: [],
  };

  if (!response) {
    return events;
  }

  response.forEach((event) => {
    const type = event.getType();
    const id = event.getArtifactId();
    if (type >= 0 && id > 0) {
      events[type].push(event);
    }
  });

  return events;
};

export const getArtifactNameFromEvent = (event: Event): string | undefined =>
  event.getPath()?.getStepsList()[0].getKey();
