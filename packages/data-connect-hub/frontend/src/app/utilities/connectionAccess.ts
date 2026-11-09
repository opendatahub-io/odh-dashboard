export type ConnectionAccessVerb = 'create' | 'delete' | 'get' | 'list';

export const getConnectionAccessTooltip = (verb: ConnectionAccessVerb): string =>
  `This action requires the ${verb} permission. To request permission, contact your administrator.`;
