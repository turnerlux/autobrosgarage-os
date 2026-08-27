# Environment configuration

Copy `.env.example` to `.env.local` for local development. Environment files other than `.env.example` are ignored by Git and must never contain committed credentials.

Server startup validates configuration before accepting requests. Error messages identify invalid variable names and rules without printing their values.

## Variables

| Variable                | Local default           | Requirement                                                          |
| ----------------------- | ----------------------- | -------------------------------------------------------------------- |
| `APP_ENV`               | `local`                 | One of `local`, `test`, `preview`, `staging`, or `production`        |
| `APP_ORIGIN`            | `http://localhost:3000` | Absolute application URL                                             |
| `LOG_LEVEL`             | `info`                  | `debug`, `info`, `warn`, or `error`                                  |
| `DATABASE_URL`          | None                    | PostgreSQL URL; required in preview, staging, and production         |
| `AUTH_SECRET`           | None                    | At least 32 characters; required in preview, staging, and production |
| `OBJECT_STORAGE_BUCKET` | None                    | Added when object storage is configured                              |
| `OPENAI_API_KEY`        | None                    | Added when the server-side AI integration is configured              |

`DATABASE_URL`, `AUTH_SECRET`, storage credentials, and AI credentials are server-only. Do not add `NEXT_PUBLIC_` aliases for them. Use the deployment platform’s encrypted secret settings for preview, staging, and production.
