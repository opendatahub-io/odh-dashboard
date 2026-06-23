type Never<Type> = {
  [K in keyof Type]?: never;
};

export type EitherNotBoth<TypeA, TypeB> = (TypeA & Never<TypeB>) | (TypeB & Never<TypeA>);
