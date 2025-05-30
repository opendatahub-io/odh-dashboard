import { z } from 'zod';
import { InputDefinitionParameterType, ParametersKF } from '#~/concepts/pipelines/kfTypes';

const stringSchema = z.string().trim().min(1, 'Hyperparameter length must be greater than 0');

const getZodTypeFromParameterType = (paramType: InputDefinitionParameterType) => {
  switch (paramType) {
    case InputDefinitionParameterType.DOUBLE:
      return z.number();
    case InputDefinitionParameterType.INTEGER:
      return z.number().int();
    case InputDefinitionParameterType.BOOLEAN:
      return z.boolean();
    case InputDefinitionParameterType.STRING:
      return stringSchema;
    case InputDefinitionParameterType.LIST:
      return z.array(z.any());
    case InputDefinitionParameterType.STRUCT:
      return z
        .string()
        .trim()
        .min(1, { message: 'Valid struct length has to be greater than 0' })
        .refine(
          (value) => {
            try {
              JSON.parse(value);
              return true;
            } catch (e) {
              return false;
            }
          },
          { message: 'Struct is not valid JSON' },
        );
  }
};

export const createHyperParametersSchema = (
  parameters: ParametersKF,
): z.ZodObject<Record<string, z.ZodTypeAny>> => {
  const hyperParamShape: Record<string, z.ZodTypeAny> = {};

  Object.entries(parameters).forEach(([key, param]) => {
    const baseType = getZodTypeFromParameterType(param.parameterType);
    if (param.isOptional && baseType === stringSchema) {
      //exception to accept empty string and relax minimum character count
      hyperParamShape[key] = z.string().optional();
    } else {
      hyperParamShape[key] = param.isOptional ? baseType.optional() : baseType;
    }
  });

  return z.object(hyperParamShape);
};

export type HyperParametersFormData = z.infer<ReturnType<typeof createHyperParametersSchema>>;
