const globNamespace = ':namespace';
export const globNamespaceAll = `/${globNamespace}?/*`;

export const genAiRootPath = '/gen-ai-studio';
export const globGenAiAll = `${genAiRootPath}/*`;

export const chatPlaygroundRootPath = `${genAiRootPath}/playground`;
export const globChatPlaygroundAll = `${chatPlaygroundRootPath}/*`;

export const aiAssetsRootPath = `${genAiRootPath}/assets`;
export const globAiAssetsAll = `${aiAssetsRootPath}/*`;

export const genAiChatPlaygroundRoute = (namespace?: string): string =>
  !namespace ? chatPlaygroundRootPath : `${chatPlaygroundRootPath}/${namespace}`;
export const genAiAiAssetsRoute = (namespace?: string): string =>
  !namespace ? aiAssetsRootPath : `${aiAssetsRootPath}/${namespace}`;

export const genAiAiAssetsTabRoute = (namespace: string, tab: string): string =>
  `${aiAssetsRootPath}/${namespace}/${tab}`;

export const maasTokensPath = '/maas/tokens';
