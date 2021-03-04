type ODHAppType = {
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
    category: string;
    quickStart: string | null;
    quickStartLength: number | null;
    tutorial: string | null;
    tutorialLength: number | null;
    howDoI: string | null;
    howDoILength: number | null;
    getStartedLink: string | null;
    getStartedMarkdown: string | null;
    comingSoon: boolean | null;
  };
};

enum ODHDocType {
  QuickStart = 'QuickStart',
  Documentation = 'Documentation',
  Tutorial = 'Tutorial',
  HowDoI = 'HowDoI',
}

export { ODHAppType, ODHDocType };
