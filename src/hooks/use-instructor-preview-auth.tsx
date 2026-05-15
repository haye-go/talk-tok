import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "talktok.instructorPreviewPassword";

interface InstructorPreviewAuthContextValue {
  previewPassword: string | null;
  setPreviewPassword: (password: string) => void;
  clearPreviewPassword: () => void;
}

const InstructorPreviewAuthContext = createContext<InstructorPreviewAuthContextValue | null>(null);

function readStoredPassword() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(STORAGE_KEY);
}

export function InstructorPreviewAuthProvider({ children }: { children: ReactNode }) {
  const [previewPassword, setPreviewPasswordState] = useState<string | null>(readStoredPassword);

  const setPreviewPassword = useCallback((password: string) => {
    window.sessionStorage.setItem(STORAGE_KEY, password);
    setPreviewPasswordState(password);
  }, []);

  const clearPreviewPassword = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setPreviewPasswordState(null);
  }, []);

  const value = useMemo(
    () => ({ previewPassword, setPreviewPassword, clearPreviewPassword }),
    [clearPreviewPassword, previewPassword, setPreviewPassword],
  );

  return (
    <InstructorPreviewAuthContext value={value}>{children}</InstructorPreviewAuthContext>
  );
}

export function useInstructorPreviewAuth() {
  const value = useContext(InstructorPreviewAuthContext);

  if (!value) {
    throw new Error("useInstructorPreviewAuth must be used inside InstructorPreviewAuthProvider.");
  }

  return value;
}
