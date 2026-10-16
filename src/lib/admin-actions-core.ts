import type { RepositoryResult } from "@/lib/marketplace-repository";

/** Keep authorization adjacent to every protected mutation and fail closed. */
export async function runAdminMutation<T>(
  authorize: () => Promise<unknown>,
  mutation: () => Promise<RepositoryResult<T>>,
): Promise<RepositoryResult<T>> {
  try {
    await authorize();
  } catch {
    return {
      ok: false,
      error: "You are not authorized to perform this action.",
    };
  }

  return mutation();
}
