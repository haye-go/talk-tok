import { Outlet } from "@tanstack/react-router";
import { InstructorPreviewAuthProvider } from "@/hooks/use-instructor-preview-auth";

export function RootLayout() {
  return (
    <InstructorPreviewAuthProvider>
      <Outlet />
    </InstructorPreviewAuthProvider>
  );
}
