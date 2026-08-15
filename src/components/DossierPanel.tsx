import { Check, Diamond, Lock, LogOut, UserRound } from "lucide-react";
import { roleLabel } from "../auth";
import { REFERENCE_IMAGES } from "../data";
import type { AuthSession, DossierStep, InventoryItem } from "../types";

type DossierPanelProps = {
  session: AuthSession | null;
  onSignOut: () => void;
  onSelectStep?: (stepId: string) => void;
  steps: DossierStep[];
  inventory: InventoryItem[];
  progressRows: {
    label: string;
    value: string;
    width: number;
  }[];
};

function statusIcon(status: DossierStep["status"]) {
  if (status === "solved") {
    return <Check size={13} />;
  }
  if (status === "locked") {
    return <Lock size={13} />;
  }
  return <Diamond size={13} />;
}

export function DossierPanel({
  session,
  onSignOut,
  onSelectStep,
  steps,
  inventory,
  progressRows,
}: DossierPanelProps) {
  return (
    <aside className="dossier-panel" aria-label="Dossier and inventory">
      <header className="brand-header">
        <h2>SKYRIM’S RELIQUARY</h2>
        <p>The Reliquary of Knowledge</p>
        <div className="investigator">
          <UserRound size={15} />
          <span>{session ? roleLabel(session.role) : "Locked"}</span>
          <strong>{session?.username ?? "No Session"}</strong>
        </div>
        {session ? (
          <button type="button" className="session-exit" onClick={onSignOut}>
            <LogOut size={14} />
            Sign Out
          </button>
        ) : null}
      </header>

      <section className="dossier-section" aria-labelledby="dossier-heading">
        <h3 id="dossier-heading">Dossier</h3>
        <ol className="dossier-list">
          {steps.map((step, index) => (
            <li
              className={[step.status, onSelectStep ? "selectable" : ""].filter(Boolean).join(" ")}
              key={step.id}
              onClick={() => onSelectStep?.(step.id)}
              onKeyDown={(event) => {
                if (!onSelectStep) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectStep(step.id);
                }
              }}
              role={onSelectStep ? "button" : undefined}
              tabIndex={onSelectStep ? 0 : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.label}</strong>
              {statusIcon(step.status)}
            </li>
          ))}
        </ol>
      </section>

      <section className="dossier-section" aria-labelledby="inventory-heading">
        <h3 id="inventory-heading">Inventory</h3>
        <div className="inventory-grid">
          {inventory.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                className={item.acquired ? "inventory-item acquired" : "inventory-item"}
                key={item.id}
                title={item.detail}
              >
                <Icon size={22} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="dossier-section progress-section" aria-labelledby="progress-heading">
        <h3 id="progress-heading">Quest Progress</h3>
        {progressRows.map((row) => (
          <div className="progress-row" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <i style={{ width: `${Math.max(0, Math.min(100, row.width))}%` }} />
          </div>
        ))}
      </section>

      <section className="style-atlas" aria-labelledby="style-heading">
        <h3 id="style-heading">Style Atlas</h3>
        <div className="atlas-strip">
          {REFERENCE_IMAGES.slice(0, 6).map((image, index) => (
            <img key={image} src={image} alt={`Theme reference ${index + 1}`} />
          ))}
        </div>
      </section>
    </aside>
  );
}
