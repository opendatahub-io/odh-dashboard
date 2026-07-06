
    export type RemoteKeys = '@mf/modelRegistry/extensions' | '@mf/modelRegistry/extension-points';
    type PackageType<T> = T extends '@mf/modelRegistry/extension-points' ? typeof import('@mf/modelRegistry/extension-points') :T extends '@mf/modelRegistry/extensions' ? typeof import('@mf/modelRegistry/extensions') :any;