
    export type RemoteKeys = 'REMOTE_ALIAS_IDENTIFIER/extensions' | 'REMOTE_ALIAS_IDENTIFIER/extension-points';
    type PackageType<T> = T extends 'REMOTE_ALIAS_IDENTIFIER/extension-points' ? typeof import('REMOTE_ALIAS_IDENTIFIER/extension-points') :T extends 'REMOTE_ALIAS_IDENTIFIER/extensions' ? typeof import('REMOTE_ALIAS_IDENTIFIER/extensions') :any;