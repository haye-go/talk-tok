declare const process: { env: Record<string, string | undefined> };

export function requireInstructorPreviewPassword(previewPassword: string) {
  const configuredPassword = process.env.INSTRUCTOR_PREVIEW_PASSWORD;

  if (!configuredPassword) {
    throw new Error("Instructor preview password is not configured.");
  }

  if (previewPassword !== configuredPassword) {
    throw new Error("Unauthorized.");
  }
}
