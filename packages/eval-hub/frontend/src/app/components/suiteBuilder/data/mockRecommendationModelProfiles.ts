import type { RecommendationModelProfile } from '~/app/types';

export const mockRecommendationModelProfiles: RecommendationModelProfile[] = [
  { id: 'preview-llama-3-2-1b', displayName: 'llama-3.2-1b-instruct' },
  { id: 'preview-mistral-7b', displayName: 'mistral-7b-instruct' },
  { id: 'preview-granite-3b', displayName: 'granite-3b', isDefault: true },
  { id: 'preview-granite-7b-redhat-lab', displayName: 'granite-7b-redhat-lab' },
  { id: 'preview-llama-3-70b', displayName: 'llama-3-70b' },
];
