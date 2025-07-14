export const modelTypeOptions = [
  {
    key: 'local-chat-completions',
    label: 'Local chat completion',
    description: 'Use this for tasks that rely on free-form generation.',
    endpoint: '/v1/chat/completions',
  },
  {
    key: 'local-completions',
    label: 'Local completion',
    description:
      'Use this for tasks that rely on multiple-choice questions, free-form generation, or chat templates.',
    endpoint: '/v1/completions',
  },
];
