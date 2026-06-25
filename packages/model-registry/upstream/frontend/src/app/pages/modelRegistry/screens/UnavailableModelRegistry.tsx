import * as React from 'react';
import { EmptyStateErrorMessage } from 'mod-arch-shared';
import AdminHelpAction from './components/AdminHelpAction';

const UNAVAILABLE_TITLE = 'Model registry unavailable';

const getUnavailableBodyText = (registryDisplayName: string, isAdmin: boolean): string =>
  isAdmin
    ? `The ${registryDisplayName} registry is currently unavailable. It might still be starting up, or there might be a configuration error. Wait a few minutes and try again. If the problem persists, check the registry configuration in Settings.`
    : `The ${registryDisplayName} registry is currently unavailable. It might still be starting up, or there might be a configuration error. Wait a few minutes and try again. If the problem persists, contact your administrator.`;

type UnavailableModelRegistryProps = {
  /** Display name of the selected registry, shown in the message (e.g. "Unavailable Registry Example"). */
  registryDisplayName: string;
  /** When true, shows admin-specific messaging and action instead of the default "contact your administrator" message. */
  isAdmin?: boolean;
  /** Custom action to render for admin users (e.g. a link to the settings page). Only used when isAdmin is true. */
  adminAction?: React.ReactNode;
};

const UnavailableModelRegistry: React.FC<UnavailableModelRegistryProps> = ({
  registryDisplayName,
  isAdmin = false,
  adminAction,
}) => (
  <div data-testid="unavailable-model-registry">
    <EmptyStateErrorMessage
      title={UNAVAILABLE_TITLE}
      bodyText={getUnavailableBodyText(registryDisplayName, isAdmin)}
    >
      {isAdmin && adminAction ? adminAction : <AdminHelpAction />}
    </EmptyStateErrorMessage>
  </div>
);

export default UnavailableModelRegistry;
