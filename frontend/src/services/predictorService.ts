import axios from 'axios';
import {
  OpenShiftRoute,
  Predictor,
  PredictorList,
  Secret,
  SecretList,
  ServingRuntimeList,
} from '../types';
import { getSecrets } from './secretService';
import { ODH_TYPE, ODH_TYPE_OBJECT_STORAGE } from '../utilities/const';
import { mlServerRuntime, servingRoute, servingSecret, tritonRuntime } from './servingSetup';

export const getPredictors = (namespace: string): Promise<PredictorList> => {
  const url = `/api/kubernetes/apis/serving.kserve.io/v1alpha1/namespaces/${namespace}/predictors`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const getServingRuntimes = (namespace: string): Promise<ServingRuntimeList> => {
  const url = `/api/kubernetes/apis/serving.kserve.io/v1alpha1/namespaces/${namespace}/servingruntimes`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const getServingRoute = (namespace: string): Promise<OpenShiftRoute> => {
  const url = `/api/kubernetes/apis/route.openshift.io/v1/namespaces/${namespace}/routes`;
  return axios
    .get(url)
    .then((response) => {
      return response.data?.items?.find((route) => route.metadata.name === 'modelmesh-serving');
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateStorageConfig = async (namespace): Promise<Secret> => {
  try {
    const secretList = await getSecrets(namespace);
    const existingStorageConfig = secretList?.items.find((secret) => {
      return secret?.metadata?.name === 'storage-config';
    });

    const data = servingSecret;
    secretList?.items.forEach((secret) => {
      if (secret && secret.metadata?.labels?.[ODH_TYPE] === ODH_TYPE_OBJECT_STORAGE) {
        data.stringData[secret.metadata.name] = JSON.stringify({
          type: 's3',
          endpoint_url: secret.data?.AWS_S3_ENDPOINT ? atob(secret.data.AWS_S3_ENDPOINT) : '',
          access_key_id: secret.data?.AWS_ACCESS_KEY_ID ? atob(secret.data.AWS_ACCESS_KEY_ID) : '',
          secret_access_key: secret.data?.AWS_SECRET_ACCESS_KEY
            ? atob(secret.data.AWS_SECRET_ACCESS_KEY)
            : '',
          default_bucket: secret.data?.AWS_DEFAULT_BUCKET
            ? atob(secret.data.AWS_DEFAULT_BUCKET)
            : '',
          region: secret.data?.AWS_DEFAULT_REGION ? atob(secret.data.AWS_DEFAULT_REGION) : '',
        });
      }
    });

    if (existingStorageConfig) {
      return axios.put(
        `/api/kubernetes/api/v1/namespaces/${namespace}/secrets/storage-config`,
        data,
      );
    } else {
      return axios.post(`/api/kubernetes/api/v1/namespaces/${namespace}/secrets`, data);
    }
  } catch {
    console.error('error updating storage-config');
    throw new Error('error updating storage-config');
  }
};

const updateRuntimes = async (namespace) => {
  try {
    const runtimes = await getServingRuntimes(namespace);
    if (!runtimes.items?.length) {
      const mlServerRuntimePromise = axios.post(
        `/api/kubernetes/apis/serving.kserve.io/v1alpha1/namespaces/${namespace}/servingruntimes`,
        mlServerRuntime,
      );
      const tritonServerPromise = axios.post(
        `/api/kubernetes/apis/serving.kserve.io/v1alpha1/namespaces/${namespace}/servingruntimes`,
        tritonRuntime,
      );
      return Promise.all([mlServerRuntimePromise, tritonServerPromise]);
    }
    return Promise.resolve(runtimes);
  } catch (e) {
    console.error('error updating serving runtimes');
    throw new Error('error updating serving runtimes');
  }
};

const updateServingRoute = async (namespace) => {
  try {
    const r = await getServingRoute(namespace);
    if (!r) {
      return axios.post(
        `/api/kubernetes/apis/route.openshift.io/v1/namespaces/${namespace}/routes`,
        servingRoute,
      );
    }
    return Promise.resolve(r);
  } catch (e) {
    console.error('error updating serving route');
    throw new Error('error updating serving route');
  }
};

export const prepareServingProject = (namespace) => {
  return Promise.all([
    updateStorageConfig(namespace),
    updateRuntimes(namespace),
    updateServingRoute(namespace),
  ]);
};

export const createPredictor = async (
  namespace: string,
  name: string,
  modelType: string,
  modelPath: string,
  secretKey: string,
): Promise<Predictor> => {
  console.log('createPredictor', namespace, name, modelType, modelPath, secretKey);
  try {
    await prepareServingProject(namespace);

    const url = `/api/kubernetes/apis/serving.kserve.io/v1alpha1/namespaces/${namespace}/predictors`;

    const postData: Predictor = {
      apiVersion: 'serving.kserve.io/v1alpha1',
      kind: 'Predictor',
      metadata: {
        name: name,
      },
      spec: {
        modelType: {
          name: modelType,
        },
        path: modelPath,
        storage: {
          s3: {
            secretKey,
          },
        },
      },
    };

    const response = await axios.post(url, postData);
    return response.data;
  } catch (e) {
    console.error('error creating predictor');
    throw new Error('error creating predictor');
  }
};

export const deletePredictor = (namespace: string, name: string): Promise<any> => {
  const url = `/api/kubernetes/apis/serving.kserve.io/v1alpha1/namespaces/${namespace}/predictors/${name}`;

  return axios
    .delete(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
