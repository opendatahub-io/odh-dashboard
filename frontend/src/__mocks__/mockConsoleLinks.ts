import { ConsoleLinkKind } from '#~/k8sTypes';
import { MOCK_MLFLOW_ICON, MOCK_ODH_ICON } from '#~/__mocks__/mockIcon';

export type ConsoleLinkData = {
  name: string;
  displayText: string;
  section: string;
  href?: string;
  location?: string;
  imageURL?: string;
};
export const mockConsoleLink = ({
  name,
  section,
  displayText,
  location,
  href,
  imageURL,
}: ConsoleLinkData): ConsoleLinkKind => ({
  apiVersion: 'console.openshift.io/v1',
  kind: 'ConsoleLink',
  metadata: {
    name,
  },
  spec: {
    applicationMenu: {
      imageURL: imageURL ?? MOCK_ODH_ICON,
      section,
    },
    href: href ?? 'https://opendatahub.io/',
    location: location ?? 'ApplicationMenu',
    text: displayText,
  },
});

export const mockOpenDataHubConsoleLink = mockConsoleLink({
  name: 'odhlink',
  displayText: 'Open Data Hub',
  section: `OpenShift Open Data Hub`,
});

export const mockMLflowLink = mockConsoleLink({
  name: 'mlflowlink',
  displayText: 'MLflow',
  section: `Applications`,
  imageURL: MOCK_MLFLOW_ICON,
  href: '/mlflow',
});

export const mockConsoleLinks = (alternatives?: ConsoleLinkKind[]): ConsoleLinkKind[] =>
  alternatives ?? [mockOpenDataHubConsoleLink, mockMLflowLink];
