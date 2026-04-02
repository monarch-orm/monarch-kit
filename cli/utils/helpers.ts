export function parseJsonInput(input: string, label: string) {
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid ${label} JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function printJsonOutput(value: unknown) {
  console.dir(value, { colors: true, depth: null, customInspect: true });
}
