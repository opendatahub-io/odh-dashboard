export type ConnectionAccessVerb = 'create' | 'delete' | 'get' | 'list';
export type ConnectionAccessResource = 'data-connections' | 'data-connection-types';

export const getConnectionAccessTooltip = (
  verb: ConnectionAccessVerb,
  resource?: ConnectionAccessResource,
): string =>
  `This action requires the ${verb} permission${resource ? ` on ${resource}` : ''}. To request permission, contact your administrator.`;
