import {
  ConnectionTypeConfigMap,
  ConnectionTypeConfigMapObj,
} from '~/concepts/connectionTypes/types';

export const toConnectionTypeConfigMapObj = (
  configMap: ConnectionTypeConfigMap,
): ConnectionTypeConfigMapObj => ({
  ...configMap,
  data: configMap.data
    ? { fields: configMap.data.fields ? JSON.parse(configMap.data.fields) : undefined }
    : undefined,
});

export const toConnectionTypeConfigMap = (
  obj: ConnectionTypeConfigMapObj,
): ConnectionTypeConfigMap => ({
  ...obj,
  data: obj.data
    ? { fields: obj.data.fields ? JSON.stringify(obj.data.fields) : undefined }
    : undefined,
});
