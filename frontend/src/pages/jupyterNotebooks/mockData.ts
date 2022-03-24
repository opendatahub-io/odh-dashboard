export const projects = [
  {
    metadata: {
      name: 'Project1',
      user: 'User1',
      creationTimestamp: '2022-02-17T20:33:09Z',
      modifyTimestamp: '2022-02-17T20:33:09Z',
    },
    spec: {
      environments: [
        {
          name: 'Enviro1',
          description: 'My environment that I use to make amazing next level predictions',
          image: {
            name: 's2i-generic-data-science-notebook',
            tag: 'v0.0.4',
          },
          size: 'Large',
          storage: {
            name: 'Enviro1_default_storage',
            total: '2GB',
            used: '1.75GB',
          },
          variable: [
            {
              variableType: 'AWS',
              variables: [
                {
                  name: 'AWS_MOCK',
                  type: 'password',
                  value: '123',
                },
              ],
              errors: {},
            },
          ],
        },
        {
          name: 'Enviro2',
          description: 'My environment that I use to make predictions',
          image: {
            name: 's2i-generic-data-science-notebook',
            tag: 'v0.0.4',
          },
          size: 'Large',
          storage: {
            name: 'Enviro2_default_storage',
            total: '2GB',
            used: '1.75GB',
          },
        },
        {
          name: 'Enviro3',
          description: 'My environment that I use to make predictions',
          image: {
            name: 's2i-generic-data-science-notebook',
            tag: 'v0.0.4',
          },
          size: 'Large',
          storage: {
            name: 'Enviro3_default_storage',
            total: '2GB',
            used: '1.75GB',
          },
        },
      ],
      data: [
        {
          source: 'pv',
          name: 'models',
          description: "A PV to help deploy Burr's presentation",
          allEnvironmentsConnections: true,
          size: 20,
          used: 17.5,
        },
        {
          source: 'database',
          providerId: 'mongodb',
          providerName: 'MongoDB',
          account: 'test-mongo-db-provider-account-2',
          database: 'mongo-so-much-data-db-project',
        },
      ],
      isProject: true,
      gitRepo: {
        name: 'git_repo2_forDataScience',
      },
    },
  },
  {
    metadata: {
      name: 'Project2',
      user: 'User1',
      creationTimestamp: '2022-02-17T20:33:09Z',
      modifyTimestamp: '2022-02-17T20:33:09Z',
    },
    spec: {
      environments: [
        {
          name: 'Enviro4',
          description: 'My environment that I use to make amazing next level predictions',
          image: {
            name: 's2i-generic-data-science-notebook',
            tag: 'v0.0.4',
          },
          size: 'Large',
          storage: {
            name: 'Enviro4_default_storage',
            total: '2GB',
            used: '1.75GB',
          },
        },
        {
          name: 'Enviro5',
          description: 'My environment that I use to make predictions',
          image: {
            name: 's2i-generic-data-science-notebook',
            tag: 'v0.0.4',
          },
          size: 'Large',
          storage: {
            name: 'Enviro5_default_storage',
            total: '2GB',
            used: '1.75GB',
          },
        },
      ],
      isProject: true,
      gitRepo: {
        name: 'git_repo2_forDataScience',
      },
    },
  },
  {
    metadata: {
      name: 'Job1',
      user: 'User1',
      creationTimestamp: '2022-02-17T20:33:09Z',
      modifyTimestamp: '2022-02-17T20:33:09Z',
    },
    spec: {
      isProject: false,
    },
  },
  {
    metadata: {
      name: 'Project3',
      user: 'User1',
      creationTimestamp: '2022-02-17T20:33:09Z',
      modifyTimestamp: '2022-02-17T20:33:09Z',
    },
    spec: {
      environments: [
        {
          name: 'Enviro6',
          description: 'My environment that I use to make amazing next level predictions',
          image: {
            name: 's2i-generic-data-science-notebook',
            tag: 'v0.0.4',
          },
          size: 'Large',
          storage: {
            name: 'Enviro6_default_storage',
            total: '2GB',
            used: '1.75GB',
          },
        },
      ],
      isProject: true,
      gitRepo: {
        name: 'git_repo3_forDataScience',
      },
    },
  },
  {
    metadata: {
      name: 'Job2',
      user: 'User1',
      creationTimestamp: '2022-02-17T20:33:09Z',
      modifyTimestamp: '2022-02-17T20:33:09Z',
    },
    spec: {
      isProject: false,
    },
  },
];

export const mockImages = [
  {
    description:
      'Jupyter notebook image with a set of data science libraries that advanced AI/ML notebooks will use as a base image to provide a standard for libraries available in all notebooks',
    display_name: 'Standard Data Science',
    name: 's2i-generic-data-science-notebook',
    order: 30,
    tags: [
      {
        build_status: 'Unknown',
        content: {
          dependencies: [
            {
              name: 'Boto3',
              version: '1.17.11',
            },
            {
              name: 'Kafka-Python',
              version: '2.0.2',
            },
            {
              name: 'Matplotlib',
              version: '3.1.3',
            },
            {
              name: 'Numpy',
              version: '1.20.3',
            },
            {
              name: 'Pandas',
              version: '1.2.4',
            },
            {
              name: 'Scipy',
              version: '1.6.3',
            },
          ],
          software: [
            {
              name: 'Python',
              version: 'v3.8.3',
            },
          ],
        },
        name: 'v0.0.4',
        recommended: false,
        default: true,
      },
      {
        build_status: 'Unknown',
        content: {
          dependencies: [
            {
              name: 'Boto3',
              version: '1.17.11',
            },
            {
              name: 'Kafka-Python',
              version: '2.0.2',
            },
            {
              name: 'Matplotlib',
              version: '3.1.3',
            },
            {
              name: 'Numpy',
              version: '1.20.3',
            },
            {
              name: 'Pandas',
              version: '1.2.4',
            },
            {
              name: 'Scipy',
              version: '1.6.3',
            },
          ],
          software: [
            {
              name: 'Python',
              version: 'v3.8.3',
            },
          ],
        },
        name: 'v0.0.24',
        recommended: true,
        default: false,
      },
    ],
    url: 'https://github.com/thoth-station/s2i-generic-data-science-notebook',
  },
  {
    description: 'Jupyter notebook image with Elyra-AI installed',
    display_name: 'Elyra Notebook Image',
    name: 's2i-lab-elyra',
    order: 100,
    tags: [
      {
        build_status: 'Unknown',
        content: {
          dependencies: [],
          software: [
            {
              name: 'Python',
              version: 'v3.8.7',
            },
          ],
        },
        name: 'v0.0.8',
        recommended: false,
        default: false,
      },
    ],
    url: 'https://github.com/thoth-station/s2i-lab-elyra',
  },
  {
    description:
      'Jupyter notebook image with minimal dependency set to start experimenting with Jupyter environment.',
    display_name: 'Minimal Python',
    name: 's2i-minimal-notebook',
    order: 10,
    tags: [
      {
        build_status: 'Running',
        content: {
          dependencies: [
            {
              name: 'JupyterLab',
              version: '3.0.14',
            },
            {
              name: 'Notebook',
              version: '6.3.0',
            },
          ],
          software: [
            {
              name: 'Python',
              version: 'v3.8.3',
            },
          ],
        },
        name: 'v0.0.14',
        recommended: true,
        default: false,
      },
      {
        build_status: 'Unknown',
        content: {
          dependencies: [
            {
              name: 'JupyterLab',
              version: '2.2.4',
            },
            {
              name: 'Notebook',
              version: '6.2.0',
            },
          ],
          software: [
            {
              name: 'Python',
              version: 'v3.6.8',
            },
          ],
        },
        name: 'v0.0.7',
        recommended: false,
        default: false,
      },
      {
        build_status: 'Unknown',
        content: {
          dependencies: [
            {
              name: 'JupyterLab',
              version: '2.2.4',
            },
            {
              name: 'Notebook',
              version: '6.2.0',
            },
          ],
          software: [
            {
              name: 'Python',
              version: 'v3.6.8',
            },
          ],
        },
        name: 'v1.0.0',
        recommended: false,
        default: false,
      },
    ],
    url: 'https://github.com/thoth-station/s2i-minimal-notebook',
  },
  {
    description:
      'Jupyter notebook image containing basic dependencies for data science and machine learning work.',
    display_name: 'SciPy Notebook Image',
    name: 's2i-scipy-notebook',
    order: 100,
    tags: [
      {
        build_status: 'Failed',
        content: {
          dependencies: [],
          software: [
            {
              name: 'Python',
              version: 'v3.8.7',
            },
          ],
        },
        name: 'v0.0.2',
        recommended: false,
        default: false,
      },
    ],
    url: 'https://github.com/thoth-station/s2i-minimal-notebook',
  },
  {
    description: null,
    display_name: 'Minimal Python with Apache Spark',
    name: 's2i-spark-minimal-notebook',
    order: 100,
    tags: [
      {
        build_status: 'Unknown',
        content: {
          dependencies: [],
          software: [],
        },
        name: 'py36-spark2.4.5-hadoop2.7.3',
        recommended: false,
        default: false,
      },
    ],
    url: null,
  },
  {
    description: null,
    display_name: 'Minimal Python with Apache Spark and SciPy',
    name: 's2i-spark-scipy-notebook',
    order: 100,
    tags: [
      {
        build_status: 'failed',
        content: {
          dependencies: [],
          software: [
            {
              name: 'Python',
              version: 'v3.8.7',
            },
          ],
        },
        name: '3.6',
        recommended: false,
        default: false,
      },
      {
        build_status: 'pending',
        content: {
          dependencies: [],
          software: [],
        },
        name: '3.5.2',
        recommended: true,
        default: false,
      },
    ],
    url: null,
  },
  {
    description: 'Jupyter notebook image containing dependencies for training Tensorflow models.',
    display_name: 'Tensorflow Notebook Image',
    name: 's2i-tensorflow-notebook',
    order: 100,
    tags: [
      {
        build_status: 'Unknown',
        content: {
          dependencies: [],
          software: [
            {
              name: 'Python',
              version: 'v3.8.7',
            },
            {
              name: 'Tensorflow CPU',
              version: 'v2.4.0',
            },
          ],
        },
        name: 'v0.0.2',
        recommended: false,
        default: false,
      },
    ],
    url: 'https://github.com/thoth-station/s2i-tensorflow-notebook',
  },
  {
    description: 'Jupyter notebook image containing dependencies for training Tensorflow models.',
    display_name: 'No Tag Content Notebook Image',
    name: 'no-tag-content-notebook',
    order: 100,
    tags: [
      {
        build_status: 'Unknown',
        name: 'notag-3.8-badsemver-1.4.1',
        recommended: false,
        default: false,
      },
      {
        build_status: 'Unknown',
        content: {
          dependencies: [],
          software: [
            {
              name: 'Python',
              version: 'v3.8.7',
            },
            {
              name: 'Tensorflow CPU',
              version: 'v2.4.0',
            },
          ],
        },
        name: 'notag-3.8-badsemver-1.0.3',
        recommended: false,
        default: false,
      },
      {
        build_status: 'Unknown',
        name: 'v0.0.4',
        recommended: false,
        default: false,
      },
    ],
    url: 'https://github.com/thoth-station/s2i-tensorflow-notebook',
  },
  {
    description: 'Jupyter notebook image containing dependencies for training Tensorflow models.',
    display_name: 'No Tags Notebook Image',
    name: 'no-tags-notebook',
    order: 100,
    url: 'https://github.com/thoth-station/s2i-tensorflow-notebook',
  },
];

export const mockSizes = ['Small', 'Medium', 'Large', 'Huge'];

export const mockSizeDescriptions = {
  ['size/Small']: {
    name: 'Small',
    resources: {
      limits: {
        cpu: 2,
        memory: '2Gi',
      },
      requests: {
        cpu: 1,
        memory: '1Gi',
      },
    },
    schedulable: true,
  },
  ['size/Medium']: {
    name: 'Medium',
    resources: {
      limits: {
        cpu: 4,
        memory: '4Gi',
      },
      requests: {
        cpu: 2,
        memory: '2Gi',
      },
    },
    schedulable: true,
  },
  ['size/Large']: {
    name: 'Large',
    resources: {
      limits: {
        cpu: 8,
        memory: '8Gi',
      },
      requests: {
        cpu: 4,
        memory: '4Gi',
      },
    },
    schedulable: true,
  },
  ['size/Huge']: {
    name: 'Huge',
    resources: {
      limits: {
        cpu: 16,
        memory: '18Gi',
      },
      requests: {
        cpu: 8,
        memory: '8Gi',
      },
    },
    schedulable: false,
  },
};

export const mockUIConfig = {
  envVarConfig: {
    categories: [
      {
        name: 'AWS',
        variables: [
          {
            name: 'AWS_BLAH',
            type: 'password',
          },
        ],
      },
    ],
    enabled: true,
  },
};

export const mockDataSources = [
  {
    id: 'pv',
    name: 'PV (persistent volume)',
  },
  {
    id: 'database',
    name: 'Database Access',
    providers: [
      {
        id: 'crunchydb',
        spec: {
          name: 'CrunchyDB',
          img: '../images/crunchydb.svg',
          accounts: [
            'test-crunchy-db-provider-account-1',
            'test-crunchy-db-provider-account-2',
            'test-crunchy-db-provider-account-3',
          ],
          database: [
            'crunchy-test-db-project',
            'crunchy-so-much-data-db-project',
            'crunchy-longer-name-test-db-project',
            'crunchy-awesome-db-project',
          ],
        },
      },
      {
        id: 'cockroachdb',
        spec: {
          name: 'CockroachDB',
          img: '../images/cockroachdb.svg',
          accounts: [
            'test-cockroach-db-provider-account-1',
            'test-cockroach-db-provider-account-2',
            'test-cockroach-db-provider-account-3',
          ],
          database: [
            'cockroach-test-db-project',
            'cockroach-so-much-data-db-project',
            'cockroach-longer-name-test-db-project',
            'cockroach-awesome-db-project',
          ],
        },
      },
      {
        id: 'mongodb',
        spec: {
          name: 'MongoDB',
          img: '../images/mongodb.svg',
          accounts: [
            'test-mongo-db-provider-account-1',
            'test-mongo-db-provider-account-2',
            'test-mongo-db-provider-account-3',
          ],
          database: [
            'mongo-test-db-project',
            'mongo-so-much-data-db-project',
            'mongo-longer-name-test-db-project',
            'mongo-awesome-db-project',
          ],
        },
      },
    ],
  },
  {
    id: 'starburst',
    name: 'Starburst',
  },
  {
    id: 'objectstorage',
    name: 'Object Storage',
  },
];
