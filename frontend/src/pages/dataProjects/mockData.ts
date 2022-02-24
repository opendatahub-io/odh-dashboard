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
            name: 'Standard Data Science',
            version: 'Python v3.8.6',
          },
          containerSize: {
            size: 'Large',
            cpu: '14 CPU, 56Gi',
            memory: '7 CPU, 24Gi Memory',
          },
          storage: {
            name: 'Enviro1_default_storage',
            total: '2GB',
            used: '1.75GB',
          },
        },
        {
          name: 'Enviro2',
          description: 'My environment that I use to make predictions',
          image: {
            name: 'Minial Python',
            version: 'Python v3.8.6',
          },
          containerSize: {
            size: 'Large',
            cpu: '14 CPU, 56Gi',
            memory: '7 CPU, 24Gi Memory',
          },
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
            name: 'Minial Python',
            version: 'Python v3.8.6',
          },
          containerSize: {
            size: 'Large',
            cpu: '14 CPU, 56Gi',
            memory: '7 CPU, 24Gi Memory',
          },
          storage: {
            name: 'Enviro3_default_storage',
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
            name: 'Standard Data Science',
            version: 'Python v3.8.6',
          },
          containerSize: {
            size: 'Large',
            cpu: '14 CPU, 56Gi',
            memory: '7 CPU, 24Gi Memory',
          },
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
            name: 'Minial Python',
            version: 'Python v3.8.6',
          },
          containerSize: {
            size: 'Large',
            cpu: '14 CPU, 56Gi',
            memory: '7 CPU, 24Gi Memory',
          },
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
            name: 'Standard Data Science',
            version: 'Python v3.8.6',
          },
          containerSize: {
            size: 'Large',
            cpu: '14 CPU, 56Gi',
            memory: '7 CPU, 24Gi Memory',
          },
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
