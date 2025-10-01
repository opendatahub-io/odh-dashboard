import {
  HealthCheckResponse,
  Namespace,
  Workspace,
  WorkspaceKind,
  WorkspaceKindInfo,
  WorkspacePauseState,
  WorkspaceRedirectMessageLevel,
  WorkspaceServiceStatus,
  WorkspaceState,
} from '~/shared/api/backendApiTypes';

export const buildMockHealthCheckResponse = (
  healthCheckResponse?: Partial<HealthCheckResponse>,
): HealthCheckResponse => ({
  status: WorkspaceServiceStatus.ServiceStatusHealthy,
  systemInfo: { version: '1.0.0' },
  ...healthCheckResponse,
});

export const buildMockNamespace = (namespace?: Partial<Namespace>): Namespace => ({
  name: 'default',
  ...namespace,
});

export const buildMockWorkspaceKindInfo = (
  workspaceKindInfo?: Partial<WorkspaceKindInfo>,
): WorkspaceKindInfo => ({
  name: 'jupyterlab',
  missing: false,
  icon: {
    url: 'https://jupyter.org/assets/favicons/apple-touch-icon-152x152.png',
  },
  logo: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Jupyter_logo.svg',
  },
  ...workspaceKindInfo,
});

export const buildMockWorkspace = (workspace?: Partial<Workspace>): Workspace => ({
  name: 'My First Jupyter Notebook',
  namespace: 'default',
  workspaceKind: buildMockWorkspaceKindInfo(),
  paused: true,
  deferUpdates: true,
  pausedTime: new Date(2025, 3, 1).getTime(),
  state: WorkspaceState.WorkspaceStateRunning,
  stateMessage: 'Workspace is running',
  podTemplate: {
    podMetadata: {
      labels: { labelKey1: 'labelValue1', labelKey2: 'labelValue2' },
      annotations: { annotationKey1: 'annotationValue1', annotationKey2: 'annotationValue2' },
    },
    volumes: {
      home: {
        pvcName: 'Volume-Home',
        mountPath: '/home',
        readOnly: false,
      },
      data: [
        {
          pvcName: 'Volume-Data1',
          mountPath: '/data',
          readOnly: true,
        },
        {
          pvcName: 'Volume-Data2',
          mountPath: '/data',
          readOnly: false,
        },
      ],
    },
    options: {
      imageConfig: {
        current: {
          id: 'jupyterlab_scipy_190',
          displayName: 'jupyter-scipy:v1.9.0',
          description: 'JupyterLab, with SciPy Packages',
          labels: [
            {
              key: 'pythonVersion',
              value: '3.11',
            },
            {
              key: 'jupyterlabVersion',
              value: '1.9.0',
            },
          ],
        },
      },
      podConfig: {
        current: {
          id: 'tiny_cpu',
          displayName: 'Tiny CPU',
          description: 'Pod with 0.1 CPU, 128 Mb RAM',
          labels: [
            {
              key: 'cpu',
              value: '100m',
            },
            {
              key: 'memory',
              value: '128Mi',
            },
            {
              key: 'gpu',
              value: '1',
            },
          ],
        },
      },
    },
  },
  activity: {
    lastActivity: new Date(2025, 5, 1).getTime(),
    lastUpdate: new Date(2025, 4, 1).getTime(),
  },
  pendingRestart: false,
  services: [
    {
      httpService: {
        displayName: 'JupyterLab',
        httpPath: 'https://jupyterlab.example.com',
      },
    },
    {
      httpService: {
        displayName: 'Spark Master',
        httpPath: 'https://spark-master.example.com',
      },
    },
  ],
  ...workspace,
});

export const buildMockWorkspaceKind = (workspaceKind?: Partial<WorkspaceKind>): WorkspaceKind => ({
  name: 'jupyterlab',
  displayName: 'JupyterLab Notebook',
  description: 'A Workspace which runs JupyterLab in a Pod',
  deprecated: false,
  deprecationMessage:
    'This WorkspaceKind will be removed on 20XX-XX-XX, please use another WorkspaceKind.',
  hidden: false,
  icon: {
    url: 'https://jupyter.org/assets/favicons/apple-touch-icon-152x152.png',
  },
  logo: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Jupyter_logo.svg',
  },
  clusterMetrics: {
    workspacesCount: 10,
  },
  podTemplate: {
    podMetadata: {
      labels: {
        myWorkspaceKindLabel: 'my-value',
      },
      annotations: {
        myWorkspaceKindAnnotation: 'my-value',
      },
    },
    volumeMounts: {
      home: '/home/jovyan',
    },
    options: {
      imageConfig: {
        default: 'jupyterlab_scipy_190',
        values: [
          {
            id: 'jupyterlab_scipy_180',
            displayName: 'jupyter-scipy:v1.8.0',
            description: 'JupyterLab, with SciPy Packages',
            labels: [
              { key: 'pythonVersion', value: '3.11' },
              { key: 'jupyterlabVersion', value: '1.8.0' },
            ],
            hidden: true,
            clusterMetrics: {
              workspacesCount: 0,
            },
            redirect: {
              to: 'jupyterlab_scipy_190',
              message: {
                text: 'This update will change...',
                level: WorkspaceRedirectMessageLevel.RedirectMessageLevelInfo,
              },
            },
          },
          {
            id: 'jupyterlab_scipy_190',
            displayName: 'jupyter-scipy:v1.9.0',
            description: 'JupyterLab, with SciPy Packages',
            labels: [
              { key: 'pythonVersion', value: '3.12' },
              { key: 'jupyterlabVersion', value: '1.9.0' },
            ],
            hidden: true,
            redirect: {
              to: 'jupyterlab_scipy_200',
              message: {
                text: 'This update will change...',
                level: WorkspaceRedirectMessageLevel.RedirectMessageLevelWarning,
              },
            },
            clusterMetrics: {
              workspacesCount: 1,
            },
          },
          {
            id: 'jupyterlab_scipy_200',
            displayName: 'jupyter-scipy:v2.0.0',
            description: 'JupyterLab, with SciPy Packages',
            labels: [
              { key: 'pythonVersion', value: '3.12' },
              { key: 'jupyterlabVersion', value: '2.0.0' },
            ],
            hidden: true,
            redirect: {
              to: 'jupyterlab_scipy_210',
              message: {
                text: 'This update will change...',
                level: WorkspaceRedirectMessageLevel.RedirectMessageLevelWarning,
              },
            },
            clusterMetrics: {
              workspacesCount: 2,
            },
          },
          {
            id: 'jupyterlab_scipy_210',
            displayName: 'jupyter-scipy:v2.1.0',
            description: 'JupyterLab, with SciPy Packages',
            labels: [
              { key: 'pythonVersion', value: '3.13' },
              { key: 'jupyterlabVersion', value: '2.1.0' },
            ],
            hidden: true,
            redirect: {
              to: 'jupyterlab_scipy_220',
              message: {
                text: 'This update will change...',
                level: WorkspaceRedirectMessageLevel.RedirectMessageLevelWarning,
              },
            },
            clusterMetrics: {
              workspacesCount: 3,
            },
          },
        ],
      },
      podConfig: {
        default: 'tiny_cpu',
        values: [
          {
            id: 'tiny_cpu',
            displayName: 'Tiny CPU',
            description: 'Pod with 0.1 CPU, 128 Mb RAM',
            hidden: false,
            labels: [
              { key: 'cpu', value: '100m' },
              { key: 'memory', value: '128Mi' },
            ],
            redirect: {
              to: 'small_cpu',
              message: {
                text: 'This update will change...',
                level: WorkspaceRedirectMessageLevel.RedirectMessageLevelDanger,
              },
            },
            clusterMetrics: {
              workspacesCount: 0,
            },
          },
          {
            id: 'large_cpu',
            displayName: 'Large CPU',
            description: 'Pod with 1 CPU, 1 Gb RAM',
            hidden: false,
            labels: [
              { key: 'cpu', value: '1000m' },
              { key: 'memory', value: '1Gi' },
              { key: 'gpu', value: '1' },
            ],
            redirect: {
              to: 'large_cpu',
              message: {
                text: 'This update will change...',
                level: WorkspaceRedirectMessageLevel.RedirectMessageLevelDanger,
              },
            },
            clusterMetrics: {
              workspacesCount: 5,
            },
          },
        ],
      },
    },
  },
  ...workspaceKind,
});

export const buildMockPauseStateResponse = (
  pauseState?: Partial<WorkspacePauseState>,
): WorkspacePauseState => ({
  paused: true,
  ...pauseState,
});

export const buildMockWorkspaceList = (args: {
  count: number;
  namespace: string;
  kind: WorkspaceKindInfo;
}): Workspace[] => {
  const states = Object.values(WorkspaceState);
  const imageConfigs = [
    {
      id: 'jupyterlab_scipy_190',
      displayName: `jupyter-scipy:v1.9.0`,
      labels: [
        { key: 'pythonVersion', value: '3.12' },
        { key: 'jupyterlabVersion', value: '1.9.0' },
      ],
    },
    {
      id: 'jupyterlab_scipy_200',
      displayName: `jupyter-scipy:v2.0.0`,
      labels: [
        { key: 'pythonVersion', value: '3.12' },
        { key: 'jupyterlabVersion', value: '2.0.0' },
      ],
    },
    {
      id: 'jupyterlab_scipy_210',
      displayName: `jupyter-scipy:v2.1.0`,
      labels: [
        { key: 'pythonVersion', value: '3.13' },
        { key: 'jupyterlabVersion', value: '2.1.0' },
      ],
    },
  ];
  const podConfigs = [
    { id: 'tiny_cpu', displayName: 'Tiny CPU' },
    { id: 'small_cpu', displayName: 'Small CPU' },
    { id: 'medium_cpu', displayName: 'Medium CPU' },
    { id: 'large_cpu', displayName: 'Large CPU' },
  ];

  const workspaces: Workspace[] = [];
  for (let i = 1; i <= args.count; i++) {
    const state = states[(i - 1) % states.length];
    const labels = {
      [`labelKey${i}`]: `labelValue${i}`,
      [`labelKey${i + 1}`]: `labelValue${i + 1}`,
    };
    const annotations = {
      [`annotationKey${i}`]: `annotationValue${i}`,
      [`annotationKey${i + 1}`]: `annotationValue${i + 1}`,
    };
    const activityTime = new Date().getTime() - i * 100000;
    const booleanValue = i % 2 === 0;
    const imageConfig = imageConfigs[i % imageConfigs.length];
    const podConfig = podConfigs[i % podConfigs.length];

    workspaces.push(
      buildMockWorkspace({
        name: `My Notebook ${i}`,
        namespace: args.namespace,
        workspaceKind: args.kind,
        state,
        stateMessage: `Workspace is in ${state} state`,
        paused: state === WorkspaceState.WorkspaceStatePaused,
        pendingRestart: booleanValue,
        podTemplate: {
          podMetadata: { labels, annotations },
          volumes: {
            home: {
              pvcName: `Volume-Home-${i}`,
              mountPath: `/home${i}`,
              readOnly: booleanValue,
            },
            data: [
              {
                pvcName: `Volume-Data1-${i}`,
                mountPath: `/data${i}`,
                readOnly: booleanValue,
              },
              {
                pvcName: `Volume-Data2-${i}`,
                mountPath: `/data${i}`,
                readOnly: booleanValue,
              },
            ],
          },
          options: {
            imageConfig: {
              current: {
                id: imageConfig.id,
                displayName: imageConfig.displayName,
                description: 'JupyterLab, with SciPy Packages',
                labels: imageConfig.labels,
              },
            },
            podConfig: {
              current: {
                id: podConfig.id,
                displayName: podConfig.displayName,
                description: `Pod with ${i}00 Millicores, ${i} GiB RAM`,
                labels: [
                  {
                    key: 'cpu',
                    value: `${i}00m`,
                  },
                  {
                    key: 'memory',
                    value: `${i}Gi`,
                  },
                  {
                    key: 'gpu',
                    value: String(i % 2 === 0 ? 2 : 1),
                  },
                ],
              },
            },
          },
        },
        activity: {
          lastActivity: activityTime,
          lastUpdate: activityTime,
        },
      }),
    );
  }
  return workspaces;
};
