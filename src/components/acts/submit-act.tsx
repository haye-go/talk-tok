import { ResponseComposer } from "@/components/submission/response-composer";
import { StreamPreview } from "@/components/submission/stream-preview";
import { MOCK_SESSION, MOCK_STREAM_RESPONSES } from "@/lib/mock-data";

interface SubmitActProps {
  topic?: string;
  wordLimit?: number;
}

export function SubmitAct({
  topic = MOCK_SESSION.topic,
  wordLimit = MOCK_SESSION.wordLimit,
}: SubmitActProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-[var(--c-sig-cream)] p-3.5">
        <p className="text-sm font-medium leading-relaxed text-[var(--c-on-sig-light)]">
          &ldquo;{topic}&rdquo;
        </p>
      </div>

      <ResponseComposer wordLimit={wordLimit} />

      <StreamPreview
        items={MOCK_STREAM_RESPONSES.map((r) => ({
          nickname: r.nickname,
          text: r.text,
          categoryColor: r.categoryColor,
        }))}
        typingCount={18}
        submittedCount={MOCK_SESSION.submittedCount}
      />
    </div>
  );
}
