import { OpenShiftRoute, Predictor } from '../types';

export const modelTypeDisplayNames = {
  sklearn: 'scikit-learn',
  xgboost: 'XGBoost ',
  lightgbm: 'LightGBM ',
  keras: 'Keras',
  onnx: 'ONNX',
  pytorch: 'PyTorch',
  tensorflow: 'TensorFlow',
  tensorrt: 'TensorRT',
};

export const getModelTypeDisplayName = (predictor: Predictor | undefined | null): string => {
  if (!predictor) {
    return '';
  }
  return modelTypeDisplayNames[predictor.spec.modelType.name] || '';
};

export const getModelRoute = (
  predictor: Predictor | undefined,
  route: OpenShiftRoute | undefined,
): string => {
  if (!predictor || !route) {
    return '';
  }
  const protocol = route.spec.tls?.termination ? 'https://' : 'http://';
  return `${protocol}${route.spec.host}/v2/models/${predictor.metadata.name}`;
};
