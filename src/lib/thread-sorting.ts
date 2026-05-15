export type ThreadSortMode = "latest" | "top";

interface SortableThread {
  root: {
    submission: {
      answeredAt?: number;
      createdAt: number;
    };
    stats: {
      upvoteCount: number;
    };
  };
}

function compareByTopActivity<T extends SortableThread>(left: T, right: T) {
  const upvoteDifference = right.root.stats.upvoteCount - left.root.stats.upvoteCount;

  if (upvoteDifference !== 0) {
    return upvoteDifference;
  }

  return right.root.submission.createdAt - left.root.submission.createdAt;
}

export function sortThreads<T extends SortableThread>(
  threads: readonly T[],
  sortMode: ThreadSortMode,
) {
  if (sortMode === "latest") {
    return [...threads];
  }

  return [...threads].sort(compareByTopActivity);
}

export function splitAndSortAnsweredThreads<T extends SortableThread>(
  threads: readonly T[],
  sortMode: ThreadSortMode,
) {
  const sortedThreads = sortThreads(threads, sortMode);

  return {
    openThreads: sortedThreads.filter((thread) => !thread.root.submission.answeredAt),
    answeredThreads: sortedThreads.filter((thread) => thread.root.submission.answeredAt),
  };
}
