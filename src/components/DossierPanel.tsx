import { Check, Diamond, Lock, UserRound } from "lucide-react";
import { REFERENCE_IMAGES } from "../data";
import type { DossierStep, InventoryItem } from "../types";

type DossierPanelProps = {
  steps: DossierStep[];
  inventory: InventoryItem[];
  solvedCount: number;
  fragmentCount: number;
  progress: number;
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

export function DossierPanel({ steps, inventory, solvedCount, fragmentCount, progress }: DossierPanelProps) {
  return (
    <aside className="dossier-panel" aria-label="Dossier and inventory">
      <header className="brand-header">
        <h2>Codex GPT</h2>
        <p>The Reliquary of Knowledge</p>
        <div className="investigator">
          <UserRound size={15} />
          <span>Investigator</span>
          <strong>Archivist-72</strong>
        </div>
      </header>

      <section className="dossier-section" aria-labelledby="dossier-heading">
        <h3 id="dossier-heading">Dossier</h3>
        <ol className="dossier-list">
          {steps.map((step, index) => (
            <li className={step.status} key={step.id}>
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
        <h3 id="progress-heading">Progress</h3>
        <div className="progress-row">
          <span>Puzzles Solved</span>
          <strong>{solvedCount} / 12</strong>
          <i style={{ width: `${Math.min(100, (solvedCount / 12) * 100)}%` }} />
        </div>
        <div className="progress-row">
          <span>Fragments Found</span>
          <strong>{fragmentCount} / 7</strong>
          <i style={{ width: `${Math.min(100, (fragmentCount / 7) * 100)}%` }} />
        </div>
        <div className="progress-row">
          <span>Vault Decrypted</span>
          <strong>{progress}%</strong>
          <i style={{ width: `${progress}%` }} />
        </div>
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
