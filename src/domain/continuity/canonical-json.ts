function assertCanonicalValue(value: unknown, path: string): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must be a finite number`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertCanonicalValue(item, `${path}[${index}]`),
    );
    return;
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} must contain only plain JSON objects`);
    }

    for (const [key, child] of Object.entries(value)) {
      if (child === undefined) {
        throw new TypeError(`${path}.${key} cannot be undefined`);
      }
      assertCanonicalValue(child, `${path}.${key}`);
    }
    return;
  }

  throw new TypeError(`${path} contains a non-JSON value`);
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)]),
    );
  }

  return value;
}

/** Serializes JSON data with recursively sorted object keys and no whitespace. */
export function canonicalJson(value: unknown): string {
  assertCanonicalValue(value, "$input");
  return JSON.stringify(sortJson(value));
}

/** Returns the lowercase SHA-256 digest of canonical JSON. */
export async function canonicalSha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function abbreviateHash(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}
