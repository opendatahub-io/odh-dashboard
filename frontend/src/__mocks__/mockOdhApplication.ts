import { OdhApplication, OdhApplicationCategory } from '~/types';

type MockOdhApplicationConfig = {
  name?: string;
  displayName?: string;
  provider?: string;
  description?: string;
  route?: string | null;
  routeNamespace?: string | null;
  routeSuffix?: string | null;
  serviceName?: string | null;
  endpoint?: string | null;
  link?: string | null;
  img?: string;
  docsLink?: string;
  hidden?: boolean | null;
  getStartedLink?: string;
  getStartedMarkDown?: string;
  category?: OdhApplicationCategory | string;
  support?: string;
  quickStart?: string | null;
  comingSoon?: boolean | null;
  beta?: boolean | null;
  betaTitle?: string | null;
  betaText?: string | null;
  shownOnEnabledPage?: boolean | null;
  isEnabled?: boolean | null;
  csvName?: string;
  annotations?: { [key: string]: string };
  enable?: {
    title: string;
    actionLabel: string;
    description?: string;
    linkPreface?: string;
    link?: string;
    variables?: { [key: string]: string };
    variableDisplayText?: { [key: string]: string };
    variableHelpText?: { [key: string]: string };
    validationSecret: string;
    validationJob: string;
    validationConfigMap?: string;
    inProgressText?: string;
  };
  featureFlag?: string;
  internalRoute?: string;
};

export const mockOdhApplication = ({
  name = 'nvidia-nim',
  displayName = 'Test Application',
  provider = 'Test Provider',
  description = 'Test Description',
  route = null,
  routeNamespace = null,
  routeSuffix = null,
  serviceName = null,
  endpoint = null,
  link = null,
  img = 'test-image.png',
  docsLink = 'https://test-docs.com',
  hidden = null,
  getStartedLink = 'https://test-getting-started.com',
  getStartedMarkDown = '# Getting Started',
  category = 'category-1',
  support = 'test-support',
  quickStart = null,
  comingSoon = null,
  beta = null,
  betaTitle = null,
  betaText = null,
  shownOnEnabledPage = null,
  isEnabled = null,
  csvName = undefined,
  annotations = {},
  enable = undefined,
  featureFlag = undefined,
  internalRoute = '/api/integrations/nim',
}: MockOdhApplicationConfig = {}): OdhApplication => ({
  metadata: {
    name,
    annotations,
  },
  spec: {
    displayName,
    provider,
    description,
    route,
    routeNamespace,
    routeSuffix,
    serviceName,
    endpoint,
    link,
    img,
    docsLink,
    hidden,
    getStartedLink,
    getStartedMarkDown,
    category,
    support,
    quickStart,
    comingSoon,
    beta,
    betaTitle,
    betaText,
    shownOnEnabledPage,
    isEnabled,
    csvName,
    enable,
    featureFlag,
    internalRoute,
  },
});
