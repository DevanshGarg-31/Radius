type Fields = Record<string, unknown>;

let context: Fields = {};

export function setLogContext(fields: Fields): void {
  context = fields;
}

function write(level: "info" | "warn" | "error", msg: string, fields?: Fields): void {
  const line = JSON.stringify({ level, msg, ...context, ...fields, ts: new Date().toISOString() });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const log = {
  info: (msg: string, fields?: Fields) => write("info", msg, fields),
  warn: (msg: string, fields?: Fields) => write("warn", msg, fields),
  error: (msg: string, fields?: Fields) => write("error", msg, fields),
};

export function errorFields(err: unknown): Fields {
  return err instanceof Error ? { error: err.message, errorName: err.name } : { error: String(err) };
}

/**
 * Emits a custom CloudWatch metric using the Embedded Metric Format.
 * Lambda ships the log line to CloudWatch, which extracts the metric automatically.
 */
export function metric(name: string, value: number, unit: "Milliseconds" | "Count" = "Count", dimensions: Record<string, string> = {}): void {
  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: "Radius",
            Dimensions: [Object.keys(dimensions)],
            Metrics: [{ Name: name, Unit: unit }],
          },
        ],
      },
      ...dimensions,
      [name]: value,
    }),
  );
}

/** Runs fn and records its duration as a metric. */
export async function timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    metric(name, Date.now() - start, "Milliseconds");
  }
}
