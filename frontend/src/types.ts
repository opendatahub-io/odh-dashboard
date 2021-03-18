type ODHApp = {
  metadata: {
    name: string;
  };
  spec: {
    displayName: string;
    provider: string;
    description: string;
    route: string | null;
    endpoint: string | null;
    link: string | null;
    img: string;
    docsLink: string;
    getStartedLink: string;
    category: string;
    support: string;
    quickStart: string | null;
    comingSoon: boolean | null;
  };
};

enum ODHDocType {
  Documentation = 'documentation',
  HowTo = 'how-to',
  QuickStart = 'quickstart',
  Tutorial = 'tutorial',
}

type ODHDoc = {
  metadata: {
    name: string;
    type: string;
  };
  spec: {
    displayName: string;
    appName?: string;
    provider?: string;
    description: string;
    url: string;
    img?: string;
    icon?: string;
    durationMinutes?: number;
    markdown?: string;
  };
};

type ODHGettingStarted = {
  appName: string;
  markdown: string;
};

export { ODHApp, ODHDocType, ODHDoc, ODHGettingStarted };
