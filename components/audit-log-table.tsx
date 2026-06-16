import { formatTimestamp } from "@/lib/formatters";
import type { AuditEvent } from "@/lib/workflow-types";
import { StatusBadge } from "./status-badge";

export function AuditLogTable({ events }: { events: AuditEvent[] }) {
  return (
    <section className="panel audit-panel">
      <div className="panel-header compact">
        <div>
          <h2>Audit log</h2>
          <p>{events.length} traceable events</p>
        </div>
      </div>
      <div className="table-wrap audit-table">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Object</th>
              <th>Before</th>
              <th>After</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{formatTimestamp(event.timestamp)}</td>
                <td>{event.actor}</td>
                <td>{event.action}</td>
                <td>{event.objectId}</td>
                <td>{event.beforeStatus === "created" || event.beforeStatus === "system" ? event.beforeStatus : <StatusBadge value={event.beforeStatus} />}</td>
                <td>
                  <StatusBadge value={event.afterStatus} />
                </td>
                <td>{event.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
