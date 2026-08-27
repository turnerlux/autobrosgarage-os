export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface LogSink {
  write(entry: Readonly<LogEntry>): void;
}

export interface LogEntry extends LogFields {
  timestamp: string;
  level: LogLevel;
  message: string;
}

const levelPriority: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const sensitiveKey = /authorization|cookie|password|secret|token|api.?key|connection.?string/i;

function redact(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.map((item) => redact(item, key, seen));
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";

  seen.add(value);
  return Object.fromEntries(
    Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      redact(childValue, childKey, seen),
    ]),
  );
}

export class JsonConsoleSink implements LogSink {
  write(entry: Readonly<LogEntry>): void {
    const serialized = JSON.stringify(entry);
    if (entry.level === "error") console.error(serialized);
    else if (entry.level === "warn") console.warn(serialized);
    else console.log(serialized);
  }
}

export class Logger {
  constructor(
    private readonly minimumLevel: LogLevel = "info",
    private readonly context: LogFields = {},
    private readonly sink: LogSink = new JsonConsoleSink(),
  ) {}

  child(context: LogFields): Logger {
    return new Logger(this.minimumLevel, { ...this.context, ...context }, this.sink);
  }

  debug(message: string, fields?: LogFields): void {
    this.log("debug", message, fields);
  }

  info(message: string, fields?: LogFields): void {
    this.log("info", message, fields);
  }

  warn(message: string, fields?: LogFields): void {
    this.log("warn", message, fields);
  }

  error(message: string, fields?: LogFields): void {
    this.log("error", message, fields);
  }

  private log(level: LogLevel, message: string, fields: LogFields = {}): void {
    if (levelPriority[level] < levelPriority[this.minimumLevel]) return;

    this.sink.write(
      Object.freeze({
        ...(redact({ ...this.context, ...fields }) as LogFields),
        timestamp: new Date().toISOString(),
        level,
        message,
      }),
    );
  }
}
