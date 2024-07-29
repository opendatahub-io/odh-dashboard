import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';

export type RegisterModelData = {
  modelRegistryName: string;
  modelName: string;
  modelDescription: string;
  versionName: string;
  versionDescription: string;
  sourceModelFormat: string;
  modelLocationType: string;
  modelLocationEndpoint: string;
  modelLocationBucket: string;
  modelLocationRegion: string;
  modelLocationPath: string;
  modelLocationURI: string;
};

const useRegisterModelData = (mrName?: string): GenericObjectState<RegisterModelData> =>
  useGenericObjectState<RegisterModelData>({
    modelRegistryName: mrName || '',
    modelName: '',
    modelDescription: '',
    versionName: '',
    versionDescription: '',
    sourceModelFormat: '',
    modelLocationType: 'Object storage',
    modelLocationEndpoint: '',
    modelLocationBucket: '',
    modelLocationRegion: '',
    modelLocationPath: '',
    modelLocationURI: '',
  });

export default useRegisterModelData;
