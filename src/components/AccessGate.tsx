import { FormEvent, useState } from "react";
import { Eye, KeyRound, ShieldCheck, Unlock, UserRound } from "lucide-react";
import { ARCHIVIST_CREDENTIALS } from "../auth";
import type { AuthSession } from "../types";

const ACCESS_WELCOME =
  "Welcome Dragonborn! You are about to embark on a remarkable journey, discovering the keys and lore of Skyrim’s Ancient Past! Be weary my fellow travelers, the puzzles you’ll find that lie before you are not for the faint of hearts! Your Destiny Awaits!";

type AccessGateProps = {
  onGuestAccess: () => void;
  onArchivistAccess: (username: string, password: string) => AuthSession | null;
};

export function AccessGate({ onGuestAccess, onArchivistAccess }: AccessGateProps) {
  const [error, setError] = useState("");
  const [username, setUsername] = useState("Archivist_Z");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleArchivistSubmit(event: FormEvent) {
    event.preventDefault();

    const session = onArchivistAccess(username, password);

    if (!session) {
      setError("Archivist credential rejected. The stone door does not know this hand.");
      return;
    }

    setError("");
  }

  return (
    <div className="access-overlay" role="presentation">
      <form className="access-window archivist-mode skyrim-gate" onSubmit={handleArchivistSubmit} aria-labelledby="access-title">
        <div className="access-sigil" aria-hidden="true">
          <ShieldCheck size={30} />
        </div>
        <header>
          <span className="access-kicker">Ancient Nordic Passage</span>
          <h2 id="access-title">
            <span>Skyrim Quest</span>
            <span>Interactive</span>
          </h2>
          <p className="access-welcome">{ACCESS_WELCOME}</p>
        </header>

        <div className="archivist-login-grid">
          <label>
            <UserRound size={15} />
            Username
            <select value={username} onChange={(event) => setUsername(event.target.value)}>
              {ARCHIVIST_CREDENTIALS.map((credential) => (
                <option key={credential.username}>{credential.username}</option>
              ))}
            </select>
          </label>
          <label>
            <KeyRound size={15} />
            Password
            <span className="password-field">
              <input
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                type={showPassword ? "text" : "password"}
                autoFocus
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Show password">
                <Eye size={15} />
              </button>
            </span>
          </label>
          <div className="credential-ledger masked" aria-label="Archivist credential ledger">
            {ARCHIVIST_CREDENTIALS.map((credential) => (
              <div key={credential.username}>
                <strong>{credential.username}</strong>
                <span>{credential.title}</span>
                <code>ADMIN ONLY</code>
              </div>
            ))}
          </div>
        </div>

        <div className="access-actions">
          <button type="button" onClick={onGuestAccess}>
            <UserRound size={16} />
            Guest View
          </button>
          <button type="submit" className="access-submit">
            <Unlock size={16} />
            Begin Quest
          </button>
        </div>

        <div className={error ? "access-error visible" : "access-error"} aria-live="polite">
          <KeyRound size={15} />
          <span>{error || " "}</span>
        </div>
      </form>
    </div>
  );
}
