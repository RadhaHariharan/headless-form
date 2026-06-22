import type { FormErrors } from '../types/validation.types.js';

/**
 * A minimal subset of the Standard Schema v1 interface.
 * Covers Zod v4, Valibot, Arktype, Effect Schema, and others that implement the spec.
 *
 * @see https://standardschema.dev
 */
export interface StandardSchema<Output> {
  /**
   * Standard Schema version marker.
   */
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    validate(
      value: unknown,
    ): StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
  };
}

/**
 * The result of a Standard Schema validation run.
 *
 * @typeParam Output - The successful output type.
 */
export type StandardSchemaResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly value?: undefined; readonly issues: ReadonlyArray<StandardSchemaIssue> };

/**
 * An issue reported by a Standard Schema validator.
 */
export interface StandardSchemaIssue {
  /**
   * The human-readable error message.
   */
  readonly message: string;
  /**
   * The path to the field that caused the issue.
   * Each segment is a string key or numeric index.
   */
  readonly path?: ReadonlyArray<string | number | { readonly key: string | number }>;
}

/**
 * Options for {@link schemaResolver}.
 */
export interface SchemaResolverOptions {
  /**
   * When `true`, the resolver will not return a `Promise` even if the underlying schema is async.
   * This is accomplished by resolving the schema synchronously via a workaround — the schema must
   * support synchronous validation, otherwise an error is thrown.
   *
   * @defaultValue `false`
   */
  sync?: boolean;
}

/**
 * Converts a Standard Schema issue path to a dot-notation string.
 *
 * @param path - The path segments from a schema issue.
 * @returns A dot-notation path string.
 */
function issuePathToString(
  path: ReadonlyArray<string | number | { readonly key: string | number }>,
): string {
  return path
    .map((segment) =>
      typeof segment === 'object' && segment !== null ? String(segment.key) : String(segment),
    )
    .join('.');
}

/**
 * Creates a `validate` function compatible with `UseFormOptions.validate` from any
 * [Standard Schema](https://standardschema.dev) compatible schema (Zod v4, Valibot,
 * Arktype, Effect Schema, etc.).
 *
 * @typeParam Values - The form values type; should match the schema's output type.
 * @typeParam TError - The error type stored in form errors.
 *
 * @param schema - A Standard Schema v1 compatible schema.
 * @param options - Optional resolver options.
 * @returns A whole-form validator function that maps schema issues to form errors.
 *
 * @see https://mantine.dev/form/schema-validation/
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * const schema = z.object({ email: z.string().email() });
 * const form = useForm({
 *   validate: schemaResolver(schema),
 *   initialValues: { email: '' },
 * });
 * ```
 */
export function schemaResolver<Values, TError = string>(
  schema: StandardSchema<Values>,
  options: SchemaResolverOptions = {},
): (values: Values) => FormErrors<TError> | Promise<FormErrors<TError>> {
  return (values: Values): FormErrors<TError> | Promise<FormErrors<TError>> => {
    const result = schema['~standard'].validate(values);

    function processResult(r: StandardSchemaResult<Values>): FormErrors<TError> {
      if (r.issues === undefined) {
        return {};
      }

      const errors: FormErrors<TError> = {};
      for (const issue of r.issues) {
        if (issue.path && issue.path.length > 0) {
          const path = issuePathToString(issue.path);
          if (!(path in errors)) {
            errors[path] = issue.message as TError;
          }
        }
      }
      return errors;
    }

    if (result instanceof Promise) {
      if (options.sync === true) {
        throw new Error(
          '[headless-form/schemaResolver] Schema returned a Promise but sync:true was requested. ' +
            'Use a synchronous schema or remove the sync option.',
        );
      }
      return result.then(processResult);
    }

    return processResult(result);
  };
}
