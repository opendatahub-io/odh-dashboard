type TrustyAIClientError = {
  title: string;
  status: number;
  violations: TrustyAIClientErrorViolation[];
};
type TrustyAIClientErrorViolation = {
  field: string;
  message: string;
};

const isTrustyAIClientError = (e: unknown): e is TrustyAIClientError =>
  typeof e === 'object' && e !== null && ['title', 'status', 'violations'].every((key) => key in e);

export const handleTrustyAIFailures = <T>(promise: Promise<T>): Promise<T> =>
  promise.then((result) => {
    if (isTrustyAIClientError(result)) {
      throw new Error(`${result.title}: ${result.violations.map((v) => v.message).join(' ')}`);
    }
    return result;
  });
