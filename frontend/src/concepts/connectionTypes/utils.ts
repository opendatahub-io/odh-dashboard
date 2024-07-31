import {
  ConnectionTypeConfigMap,
  ConnectionTypeConfigMapObj,
} from '~/concepts/connectionTypes/types';

export const toConnectionTypeConfigMapObj = (
  configMap: ConnectionTypeConfigMap,
): ConnectionTypeConfigMapObj => ({
  ...configMap,
  data: { fields: configMap.data.fields ? JSON.parse(configMap.data.fields) : undefined },
});

export const toConnectionTypeConfigMap = (
  obj: ConnectionTypeConfigMapObj,
): ConnectionTypeConfigMap => ({
  ...obj,
  data: { fields: obj.data.fields ? JSON.stringify(obj.data.fields) : undefined },
});
