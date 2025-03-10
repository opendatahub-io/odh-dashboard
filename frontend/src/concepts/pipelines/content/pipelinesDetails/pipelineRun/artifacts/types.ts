export interface ArtifactProperty {
  name: string;
  value: string;
}

export type PipelineRunArtifactModelData = {
  registeredModelName?: string;
  modelRegistryName?: string;
  modelVersionName?: string;
  modelVersionId?: string;
  registeredModelId?: string;
};
