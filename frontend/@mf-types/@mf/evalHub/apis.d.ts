
    export type RemoteKeys = '@mf/evalHub/extensions' | '@mf/evalHub/extension-points';
    type PackageType<T> = T extends '@mf/evalHub/extension-points' ? typeof import('@mf/evalHub/extension-points') :T extends '@mf/evalHub/extensions' ? typeof import('@mf/evalHub/extensions') :any;