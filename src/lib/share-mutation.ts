export async function writeThenRead<T>(
  write: () => Promise<unknown>,
  read: () => Promise<T>,
): Promise<{ writeError: unknown | null; state: T }> {
  let writeError: unknown | null = null;
  try {
    await write();
  } catch (error) {
    writeError = error;
  }

  const state = await read();
  return { writeError, state };
}
