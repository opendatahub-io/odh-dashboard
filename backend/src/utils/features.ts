import * as fs from 'fs';
import * as path from 'path';

export const getComponentFeatureFlags = (): { [key: string]: string } => {
  const normalizedPath = path.resolve(process.cwd(), '../data/features.json');
  try {
    return JSON.parse(fs.readFileSync(normalizedPath, 'utf8'));
  } catch {
    return {};
  }
};
