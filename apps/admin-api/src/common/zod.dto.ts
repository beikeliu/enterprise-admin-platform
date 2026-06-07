import { ZodSchema } from 'zod';

export const createZodDto = <T extends ZodSchema>(schema: T) => {
  class ZodDto {
    static schema = schema;
  }
  Reflect.defineMetadata('zod:schema', schema, ZodDto);
  return ZodDto;
};
