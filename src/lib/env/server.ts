import { z } from "zod";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const postgresUrl = z
  .url("must be a valid URL")
  .refine((value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol), {
    message: "must use the postgres or postgresql protocol",
  });

const serverEnvironmentSchema = z
  .object({
    APP_ENV: z.enum(["local", "test", "preview", "staging", "production"]).default("local"),
    APP_ORIGIN: z.url().default("http://localhost:3000"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    DATABASE_URL: optional(postgresUrl),
    AUTH_SECRET: optional(z.string().min(32, "must contain at least 32 characters")),
    AUTH_SHOP_SLUG: z.string().trim().min(1).default("auto-bros-garage"),
    OBJECT_STORAGE_BUCKET: optional(z.string().min(1)),
    OPENAI_API_KEY: optional(z.string().min(20)),
    ANTHROPIC_API_KEY: optional(z.string().min(20)),
    AI_MODEL: optional(z.string().trim().min(1)),
  })
  .superRefine((environment, context) => {
    if (["local", "test"].includes(environment.APP_ENV)) return;

    for (const key of ["DATABASE_URL", "AUTH_SECRET"] as const) {
      if (!environment[key]) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `is required when APP_ENV is ${environment.APP_ENV}`,
        });
      }
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export class EnvironmentValidationError extends Error {
  constructor(public readonly problems: readonly string[]) {
    super(`Invalid server environment:\n- ${problems.join("\n- ")}`);
    this.name = "EnvironmentValidationError";
  }
}

export function parseServerEnvironment(
  source: Record<string, string | undefined>,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(source);

  if (!result.success) {
    throw new EnvironmentValidationError(
      result.error.issues.map(
        (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
      ),
    );
  }

  return result.data;
}

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  cachedEnvironment ??= parseServerEnvironment(process.env);
  return cachedEnvironment;
}
