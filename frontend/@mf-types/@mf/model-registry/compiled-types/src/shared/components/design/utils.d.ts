import './vars.scss';
export declare enum ProjectObjectType {
    registeredModels = "registered-models"
}
export declare const typedBackgroundColor: (objectType: ProjectObjectType) => string;
export declare const typedObjectImage: (objectType: ProjectObjectType) => string;
export declare const typedEmptyImage: (objectType: ProjectObjectType, option?: string) => string;
