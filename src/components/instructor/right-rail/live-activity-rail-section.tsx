interface ActivityEvent {
  id: string;
  actorType: string;
  action: string;
  targetType?: string;
  createdAt: number;
}

export interface LiveActivityRailSectionProps {
  activity: ReadonlyArray<ActivityEvent>;
}

export function LiveActivityRailSection({ activity }: LiveActivityRailSectionProps) {
  const studentActivity = activity.filter((event) => event.actorType === "participant");

  return (
    <section className="grid gap-2">
      <p className="text-xs font-semibold text-[var(--c-muted)]">Live Activity</p>
      {studentActivity.length === 0 ? (
        <p className="text-sm text-[var(--c-muted)]">No student activity yet.</p>
      ) : (
        studentActivity.slice(0, 8).map((event) => (
          <div
            key={event.id}
            className="border-b border-[#d7e0ea] pb-2 text-xs text-[var(--c-body)]"
          >
            <strong>{event.actorType}</strong> {event.action.replace(/_/g, " ")}
            {event.targetType ? (
              <span className="text-[var(--c-muted)]"> on {event.targetType}</span>
            ) : null}
            <span className="ml-1.5 text-[10px] text-[var(--c-muted)]">
              {new Date(event.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))
      )}
    </section>
  );
}
