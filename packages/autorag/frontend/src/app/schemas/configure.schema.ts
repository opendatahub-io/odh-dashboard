/* eslint-disable camelcase */
import * as z from 'zod';

const dataReferenceSchema = z.object({
  connection_id: z.string(),
  bucket: z.string(),
  path: z.string(),
});

const dataReferenceDefault = {
  connection_id: '',
  bucket: '',
  path: '',
};

function getBaseSchema() {
  return z.object({
    name: z.string().min(1),
    input_data_reference: dataReferenceSchema.default(dataReferenceDefault),
    test_data_reference: dataReferenceSchema.default(dataReferenceDefault),
    results_reference: dataReferenceSchema.default(dataReferenceDefault),
    optimization: z
      .object({
        max_number_of_rag_patterns: z.number().min(1).max(10),
        metric: z.enum(['faithfulness', 'answer_correctness', 'context_correctness']),
      })
      .default({
        max_number_of_rag_patterns: 4,
        metric: 'faithfulness',
      }),
    embeddings_constraints: z
      .array(
        z.object({
          model: z.string(),
        }),
      )
      .optional(),
    generation_constraints: z
      .array(
        z.object({
          model: z.string(),
          context_template_text: z.string().optional(),
          messages: z
            .array(
              z.object({
                role: z.string(),
                content: z.string(),
                name: z.string(),
              }),
            )
            .optional(),
        }),
      )
      .optional(),
  });
}

// Make sure every field has a default to ensure RHF works as intended.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function createConfigureSchema() {
  return getBaseSchema()
    .superRefine((data, { addIssue }) => {
      for (const validate of VALIDATORS) {
        for (const issue of validate(data)) {
          addIssue(issue);
        }
      }
    })
    .transform((data) => {
      for (const transform of TRANSFORMERS) {
        transform(data);
      }
      return data;
    });
}

export type ConfigureSchema = z.infer<ReturnType<typeof createConfigureSchema>>;

type Validator = (data: ConfigureSchema) => z.core.$ZodRawIssue[];
type Transformer = (data: ConfigureSchema) => void;

const VALIDATORS: Array<Validator> = [];

const TRANSFORMERS: Array<Transformer> = [];

export default createConfigureSchema;
