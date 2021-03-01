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
    support: string;
    offering: string;
    quickstart: string;
    tutorial: string;
    getstarted: string;
  };
};

export { ODHAppType };
