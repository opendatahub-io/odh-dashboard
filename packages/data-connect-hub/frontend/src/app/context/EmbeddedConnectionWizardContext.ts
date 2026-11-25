import React from 'react';
import type { ConnectionTypeProviders } from '~/types/embeddable-create-connection-wizard';

type EmbeddedConnectionWizardContextValue = {
  isEmbedded: boolean;
  isNamespaceSelectable: boolean;
  enableCredentialVerification: boolean;
  tearsheetStackLevel?: number;
  connectionTypeProviders?: ConnectionTypeProviders;
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
