const DEFAULT_TIMEOUT_MS = 4_000;

export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function responseError(
  provider: string,
  response: Response,
): Promise<Error> {
  const body = (await response.text()).slice(0, 500);
  return new Error(
    `[${provider}] request failed with HTTP ${response.status}${body ? `: ${body}` : ""}`,
  );
}
