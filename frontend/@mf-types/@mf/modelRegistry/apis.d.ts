
    export type RemoteKeys = '@mf/modelRegistry/index' | '@mf/modelRegistry/plugin';
    type PackageType<T> = T extends '@mf/modelRegistry/plugin' ? typeof import('@mf/modelRegistry/plugin') :T extends '@mf/modelRegistry/index' ? typeof import('@mf/modelRegistry/index') :any;