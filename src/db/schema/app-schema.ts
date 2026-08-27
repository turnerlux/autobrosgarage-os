import { pgSchema } from "drizzle-orm/pg-core";

/** Application-owned records live outside PostgreSQL's public schema. */
export const appSchema = pgSchema("app");
