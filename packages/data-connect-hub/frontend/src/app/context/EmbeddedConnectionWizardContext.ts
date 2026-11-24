import React from 'react';

type EmbeddedConnectionWizardContextValue = {
  isEmbedded: boolean;
  isNamespaceSelectable: boolean;
  enableCredentialVerification: boolean;
  tearsheetStackLevel?: number;
  connectionTypeProviders?: string[];
};

const defaultEmbeddedConnectionWizardContext: EmbeddedConnectionWizardContextValue = {
  isEmbedded: false,
  isNamespaceSelectable: true,
  enableCredentialVerification: true,
  tearsheetStackLevel: undefined,
  connectionTypeProviders: undefined,
};

export const EmbeddedConnectionWizardContext =
  React.createContext<EmbeddedConnectionWizardContextValue>(defaultEmbeddedConnectionWizardContext);

export const useEmbeddedConnectionWizard = (): EmbeddedConnectionWizardContextValue =>
  React.useContext(EmbeddedConnectionWizardContext);
