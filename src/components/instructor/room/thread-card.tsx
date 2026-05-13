import { SubmissionCard } from "@/components/submission/submission-card";
import { Badge } from "@/components/ui/badge";

interface SubmissionShape {
  id: string;
  createdAt: number;
  [key: string]: unknown;
}

interface ThreadStats {
  upvoteCount: number;
  replyCount: number;
}

interface ThreadAssignment {
  categoryName?: string;
}

export interface ThreadCardData {
  root: {
    submission: SubmissionShape;
    stats: ThreadStats;
    nickname?: string;
  };
  replies: ReadonlyArray<{
    submission: SubmissionShape;
  }>;
  assignment: ThreadAssignment | null;
}

export interface ThreadCardProps {
  thread: ThreadCardData;
}

export function ThreadCard({ thread }: ThreadCardProps) {
  const { root, replies, assignment } = thread;
  const submission = root.submission;

  return (
    <div className="rounded-[18px] border border-[#d7e0ea] bg-white">
      <SubmissionCard submission={submission as never} />
      <div className="border-t border-[#e7edf3] px-4 py-3 text-xs text-[var(--c-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={assignment ? "neutral" : "warning"}>
            {assignment?.categoryName ?? "Uncategorized"}
          </Badge>
          <span>{root.stats.upvoteCount} upvotes</span>
          <span>{root.stats.replyCount} replies</span>
          <span>
            {new Date(submission.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {replies.length > 0 ? (
          <details className="mt-3">
            <summary className="cursor-pointer font-medium text-[var(--c-ink)]">
              Show replies
            </summary>
            <div className="mt-3 grid gap-2">
              {replies.map((reply) => (
                <div
                  key={reply.submission.id}
                  className="ml-4 border-l-2 border-[#dbe5ee] pl-3"
                >
                  <SubmissionCard submission={reply.submission as never} />
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
