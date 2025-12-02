export const LLMD_OPTION = {
  name: 'llmd-serving',
  label: 'Distributed Inference Server with llm-d',
};

export const extractModelServerTemplate = (): {
  name: string;
  label?: string;
  namespace?: string;
  scope?: string;
} => {
  return {
    name: 'llmd-serving',
    label: 'Distributed Inference Server with llm-d',
  };
};
