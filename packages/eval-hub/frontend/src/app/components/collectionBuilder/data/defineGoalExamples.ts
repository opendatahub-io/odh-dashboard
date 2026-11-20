export type DefineGoalExample = {
  id: string;
  title: string;
  description: string;
};

export const defineGoalExamples: DefineGoalExample[] = [
  {
    id: 'answer-quality',
    title: 'Answer quality',
    description: 'Assess a model’s accuracy and truthfulness across common questions.',
  },
  {
    id: 'safe-responses',
    title: 'Safe responses',
    description: 'Check whether a model follows instructions and avoids harmful answers.',
  },
  {
    id: 'instruction-following',
    title: 'Instruction following',
    description:
      'Measure how reliably a model follows formatting, length, and keyword requirements.',
  },
  {
    id: 'code-generation',
    title: 'Code generation',
    description:
      'Evaluate whether a coding assistant generates correct Python functions from requests.',
  },
  {
    id: 'security-risks',
    title: 'Security risks',
    description: 'Assess how well a model handles prompt injection and other LLM security risks.',
  },
  {
    id: 'math-reasoning',
    title: 'Math reasoning',
    description: 'Check how accurately a model solves multi-step math word problems.',
  },
  {
    id: 'factual-knowledge',
    title: 'Factual knowledge',
    description: 'Measure whether a model gives correct answers to general knowledge questions.',
  },
  {
    id: 'customer-support',
    title: 'Customer support',
    description: 'Evaluate the accuracy and safety of customer support responses.',
  },
  {
    id: 'adversarial-content',
    title: 'Adversarial content',
    description: 'Check whether a model avoids harmful language in challenging conversations.',
  },
];
