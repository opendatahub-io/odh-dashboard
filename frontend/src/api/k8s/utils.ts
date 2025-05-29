import { VolumeMount, Volume } from '#~/types';

export const getshmVolumeMount = (): VolumeMount => ({
  name: 'shm',
  mountPath: '/dev/shm',
});

export const getshmVolume = (sizeLimit?: string): Volume => ({
  name: 'shm',
  emptyDir: { medium: 'Memory', ...(sizeLimit && { sizeLimit }) },
});

export const parseCommandLine = (input: string): string[] => {
  const args: string[] = [];
  const regex = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    let arg: string = match[0];

    // Remove surrounding quotes if any
    if (arg.startsWith('"') && arg.endsWith('"')) {
      arg = arg.slice(1, -1).replace(/\\"/g, '"'); // Unescape double quotes
    } else if (arg.startsWith("'") && arg.endsWith("'")) {
      arg = arg.slice(1, -1); // Remove single quotes
    }

    args.push(arg);
  }

  return args;
};
