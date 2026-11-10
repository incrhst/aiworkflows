interface Item {
  id: string;
  title: string;
  inBaseline: boolean;
  status: "active" | "removed" | "deferred";
  deferredTo?: string;
}

/** Current scope next to the original baseline, with each change marked. */
export function ScopeTable({
  items,
  baselineDate,
  currentDate,
  decisionLabel,
}: {
  items: Item[];
  baselineDate: string;
  currentDate: string;
  decisionLabel?: (itemId: string) => string | undefined;
}) {
  return (
    <div className="card">
      <div className="stats">
        <span>
          Baseline date: <strong>{baselineDate}</strong>
        </span>
        <span>
          Current date:{" "}
          <strong className={currentDate !== baselineDate ? "pill change" : undefined}>
            {currentDate}
          </strong>
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Deliverable</th>
            <th>Baseline</th>
            <th>Now</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const label = decisionLabel?.(item.id);
            return (
              <tr key={item.id}>
                <td className={item.status === "active" ? undefined : "struck"}>{item.title}</td>
                <td>{item.inBaseline ? "Yes" : <span className="pill change">Added</span>}</td>
                <td>
                  {item.status === "active" && "In scope"}
                  {item.status === "removed" && <span className="pill change">Swapped out</span>}
                  {item.status === "deferred" && (
                    <span className="pill change">Deferred: {item.deferredTo}</span>
                  )}
                  {label && <span className="muted"> ({label})</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
