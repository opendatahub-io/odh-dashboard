import './vars.scss';
export declare enum SectionType {
    setup = "set-up",
    organize = "organize",
    training = "training",
    serving = "serving",
    general = "general"
}
export declare enum ProjectObjectType {
    project = "project",
    projectContext = "projectContext",
    notebook = "notebook",
    notebookImage = "notebookImage",
    build = "build",
    pipelineSetup = "pipeline-setup",
    pipeline = "pipeline",
    pipelineRun = "pipeline-run",
    pipelineExperiment = "pipeline-experiment",
    pipelineExecution = "pipeline-execution",
    pipelineArtifact = "pipeline-artifact",
    clusterStorage = "cluster-storage",
    model = "model",
    singleModel = "single-model",
    multiModel = "multi-model",
    modelServer = "model-server",
    registeredModels = "registered-models",
    deployedModels = "deployed-models",
    deployingModels = "deploying-models",
    modelRegistrySettings = "model-registry-settings",
    servingRuntime = "serving-runtime",
    distributedWorkload = "distributed-workload",
    dataConnection = "data-connection",
    connections = "connections",
    clusterSettings = "cluster-settings",
    acceleratorProfile = "accelerator-profile",
    permissions = "permissions",
    user = "user",
    group = "group",
    storageClasses = "storageClasses",
    enabledApplications = "enabled-applications",
    exploreApplications = "explore-applications",
    resources = "resources"
}
export declare const typedIconColor: (objectType: ProjectObjectType) => string;
export declare const typedBackgroundColor: (objectType: ProjectObjectType) => string;
export declare const typedColor: (objectType: ProjectObjectType) => string;
export declare const typedObjectImage: (objectType: ProjectObjectType) => string;
export declare const typedEmptyImage: (objectType: ProjectObjectType, option?: string) => string;
export declare const sectionTypeIconColor: (sectionType: SectionType) => string;
export declare const sectionTypeBackgroundColor: (sectionType: SectionType) => string;
export declare const sectionTypeBorderColor: (sectionType: SectionType) => string;
