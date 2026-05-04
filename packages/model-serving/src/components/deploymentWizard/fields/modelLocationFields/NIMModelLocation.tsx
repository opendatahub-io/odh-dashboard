export const NIMModelLocationKey = 'nvidia-nim';

export const NIMModelLocationOption = {
  key: NIMModelLocationKey,
  label: 'NVIDIA NIM',
};

export type NIMModel = {
  name: string;
  namespace: string;
  tag?: string;
  metadata: {
    displayName?: string;
    shortDescription?: string;
    tags?: string[];
    latestTag?: string;
    updatedDate?: string;
  };
};
