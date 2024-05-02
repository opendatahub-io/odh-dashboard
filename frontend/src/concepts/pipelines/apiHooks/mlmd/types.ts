import { Artifact, Context, ContextType, Event } from '~/third_party/mlmd';

export type MlmdContext = Context;

export type MlmdContextType = ContextType;

export enum MlmdContextTypes {
  RUN = 'system.PipelineRun',
}

// An artifact which has associated event.
// You can retrieve artifact name from event.path.steps[0].key
export interface LinkedArtifact {
  event: Event;
  artifact: Artifact;
}
