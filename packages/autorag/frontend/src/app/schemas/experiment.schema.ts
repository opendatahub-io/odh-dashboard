import * as z from 'zod';

const Experiment = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export default Experiment;
