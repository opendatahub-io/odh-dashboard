export enum KnownLabels {
  DASHBOARD_RESOURCE = 'opendatahub.io/dashboard',
  PROJECT_SHARING = 'opendatahub.io/project-sharing',
  MODEL_SERVING_PROJECT = 'modelmesh-enabled',
  DATA_CONNECTION_AWS = 'opendatahub.io/managed',
  LABEL_SELECTOR_MODEL_REGISTRY = 'component=model-registry',
  LABEL_SELECTOR_DATA_SCIENCE_PIPELINES = 'data-science-pipelines',
  PROJECT_SUBJECT = 'opendatahub.io/rb-project-subject',
  REGISTERED_MODEL_ID = 'modelregistry.opendatahub.io/registered-model-id',
  MODEL_VERSION_ID = 'modelregistry.opendatahub.io/model-version-id',
  MODEL_REGISTRY_NAME = 'modelregistry.opendatahub.io/name',
  KUEUE_MANAGED = 'kueue.openshift.io/managed',
}