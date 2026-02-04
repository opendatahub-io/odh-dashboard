import * as z from 'zod';

const Experiment = z.object({
  name: z.string().nonempty(),
  description: z.string().optional(),
});

export default Experiment;
