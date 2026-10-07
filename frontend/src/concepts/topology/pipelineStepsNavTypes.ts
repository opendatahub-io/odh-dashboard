import { PipelineNodeModelExpanded } from './types';

/** Shared props for swappable pipeline steps navigation variants. */
export type PipelineStepsNavProps = {
  nodes: PipelineNodeModelExpanded[];
  onNodeSelect: (id: string) => void;
};
