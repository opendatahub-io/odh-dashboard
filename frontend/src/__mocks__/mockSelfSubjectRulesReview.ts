import { SelfSubjectRulesReviewKind } from '~/k8sTypes';

export const mockSelfSubjectRulesReview = (): SelfSubjectRulesReviewKind => ({
  kind: 'SelfSubjectRulesReview',
  apiVersion: 'authorization.k8s.io/v1',
  spec: {
    namespace: 'odh-model-registries',
  },
  status: {
    resourceRules: [
      {
        verbs: ['create'],
        apiGroups: ['', 'project.openshift.io'],
        resources: ['projectrequests'],
      },
      {
        verbs: ['impersonate'],
        apiGroups: ['authentication.k8s.io'],
        resources: ['userextras/scopes.authorization.openshift.io'],
      },
      {
        verbs: ['get', 'list', 'watch'],
        apiGroups: ['helm.openshift.io'],
        resources: ['helmchartrepositories'],
      },
      {
        verbs: ['create'],
        apiGroups: ['authorization.k8s.io'],
        resources: ['selfsubjectaccessreviews', 'selfsubjectrulesreviews'],
      },
      {
        verbs: ['create'],
        apiGroups: ['authentication.k8s.io'],
        resources: ['selfsubjectreviews'],
      },
      {
        verbs: ['create'],
        apiGroups: ['', 'project.openshift.io'],
        resources: ['projectrequests'],
      },
      {
        verbs: ['get', 'list', 'watch', 'delete'],
        apiGroups: ['oauth.openshift.io'],
        resources: ['useroauthaccesstokens'],
      },
      {
        verbs: ['get', 'list', 'watch'],
        apiGroups: ['snapshot.storage.k8s.io'],
        resources: ['volumesnapshotclasses'],
      },
      {
        verbs: ['get'],
        apiGroups: ['', 'user.openshift.io'],
        resources: ['users'],
        resourceNames: ['~'],
      },
      {
        verbs: ['list'],
        apiGroups: ['', 'project.openshift.io'],
        resources: ['projectrequests'],
      },
      {
        verbs: ['get', 'list'],
        apiGroups: ['', 'authorization.openshift.io'],
        resources: ['clusterroles'],
      },
      {
        verbs: ['get', 'list', 'watch'],
        apiGroups: ['rbac.authorization.k8s.io'],
        resources: ['clusterroles'],
      },
      {
        verbs: ['get', 'list'],
        apiGroups: ['storage.k8s.io'],
        resources: ['storageclasses'],
      },
      {
        verbs: ['list', 'watch'],
        apiGroups: ['', 'project.openshift.io'],
        resources: ['projects'],
      },
      {
        verbs: ['create'],
        apiGroups: ['', 'authorization.openshift.io'],
        resources: ['selfsubjectrulesreviews'],
      },
      {
        verbs: ['create'],
        apiGroups: ['authorization.k8s.io'],
        resources: ['selfsubjectaccessreviews'],
      },
      {
        verbs: ['delete'],
        apiGroups: ['', 'oauth.openshift.io'],
        resources: ['oauthaccesstokens', 'oauthauthorizetokens'],
      },
      {
        verbs: ['create'],
        apiGroups: ['', 'build.openshift.io'],
        resources: ['builds/source'],
      },
      {
        verbs: ['create'],
        apiGroups: ['', 'authorization.openshift.io'],
        resources: ['selfsubjectrulesreviews'],
      },
      {
        verbs: ['create'],
        apiGroups: ['authorization.k8s.io'],
        resources: ['selfsubjectaccessreviews'],
      },
      {
        verbs: ['create', 'get'],
        apiGroups: ['', 'build.openshift.io'],
        resources: ['buildconfigs/webhooks'],
      },
      {
        verbs: ['create'],
        apiGroups: ['', 'build.openshift.io'],
        resources: ['builds/jenkinspipeline'],
      },
      {
        verbs: ['use'],
        apiGroups: ['security.openshift.io'],
        resources: ['securitycontextconstraints'],
        resourceNames: ['restricted-v2'],
      },
      {
        verbs: ['get', 'list', 'watch'],
        apiGroups: ['console.openshift.io'],
        resources: [
          'consoleclidownloads',
          'consoleexternalloglinks',
          'consolelinks',
          'consolenotifications',
          'consoleplugins',
          'consolequickstarts',
          'consolesamples',
          'consoleyamlsamples',
        ],
      },
      {
        verbs: ['create'],
        apiGroups: ['', 'build.openshift.io'],
        resources: ['builds/docker', 'builds/optimizeddocker'],
      },
      {
        verbs: ['get'],
        apiGroups: [''],
        resources: ['services'],
        resourceNames: ['modelregistry-sample'],
      },
      {
        verbs: ['get'],
        apiGroups: [''],
        resources: ['services'],
        resourceNames: ['dallas-mr'],
      },
    ],
    nonResourceRules: [
      {
        verbs: ['get'],
        nonResourceURLs: ['/healthz', '/healthz/'],
      },
      {
        verbs: ['get'],
        nonResourceURLs: [
          '/version',
          '/version/*',
          '/api',
          '/api/*',
          '/apis',
          '/apis/*',
          '/oapi',
          '/oapi/*',
          '/openapi/v2',
          '/swaggerapi',
          '/swaggerapi/*',
          '/swagger.json',
          '/swagger-2.0.0.pb-v1',
          '/osapi',
          '/osapi/',
          '/.well-known',
          '/.well-known/oauth-authorization-server',
          '/',
        ],
      },
      {
        verbs: ['get'],
        nonResourceURLs: [
          '/version',
          '/version/*',
          '/api',
          '/api/*',
          '/apis',
          '/apis/*',
          '/oapi',
          '/oapi/*',
          '/openapi/v2',
          '/swaggerapi',
          '/swaggerapi/*',
          '/swagger.json',
          '/swagger-2.0.0.pb-v1',
          '/osapi',
          '/osapi/',
          '/.well-known',
          '/.well-known/oauth-authorization-server',
          '/',
        ],
      },
      {
        verbs: ['get'],
        nonResourceURLs: [
          '/api',
          '/api/*',
          '/apis',
          '/apis/*',
          '/healthz',
          '/livez',
          '/openapi',
          '/openapi/*',
          '/readyz',
          '/version',
          '/version/',
        ],
      },
      {
        verbs: ['get'],
        nonResourceURLs: ['/.well-known', '/.well-known/*'],
      },
      {
        verbs: ['get'],
        nonResourceURLs: ['/healthz', '/livez', '/readyz', '/version', '/version/'],
      },
    ],
    incomplete: false,
  },
});