import { RegisteredModelLocation } from '~/app/utils';
export declare enum ModelServingCompatibleTypes {
    S3ObjectStorage = "S3 compatible object storage",
    URI = "URI",
    OCI = "OCI compliant registry"
}
export declare const URIConnectionTypeKeys: string[];
export declare const OCIConnectionTypeKeys: string[];
export declare const OCIAccessTypeKey: string[];
export declare const S3ConnectionTypeKeys: string[];
export declare const uriToModelLocation: (uri?: string) => RegisteredModelLocation;
export declare const getModelServingConnectionTypeName: (type: ModelServingCompatibleTypes) => string;
export declare const uriToConnectionTypeName: (uri?: string) => string;
export declare const getDeployButtonState: (availablePlatformIds: string[], requireKserve?: boolean) => {
    enabled?: boolean;
    tooltip?: string;
};
