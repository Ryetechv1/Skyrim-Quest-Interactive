import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { Eye, KeyRound, LockKeyhole, RefreshCcw, ShieldCheck, Unlock, UserRound } from "lucide-react";
import { ARCHIVIST_CREDENTIALS } from "../auth";
import type { AuthSession } from "../types";

const ACCESS_MESSAGE =
  "Every letter has a place, but time moves forward by two days' space. When Sunday passes, the clock rewinds, and Monday morning is what you'll find.";

const MIRROR_MESSAGE =
  'Look in the glass where the backwards dwell, read from the end to break the spell. What time has taken and flipped around, in proper order must now be found. "RETNE WON YAM UOY"';

const ACCESS_GROUPS = [
  ["1", "17", "23"],
  ["15", "3", "1"],
  ["16", "17", "25"],
  ["7", "16", "22", "7", "20"],
] as const;

const ACCESS_CODE = ACCESS_GROUPS.map((group) => group.join("-")).join(" ");

type AccessGateProps = {
  onGuestAccess: () => void;
  onArchivistAccess: (username: string, password: string) => AuthSession | null;
};

function makeInitialValues() {
  return ACCESS_GROUPS.map((group) => group.map(() => ""));
}

function flattenIndex(groupIndex: number, slotIndex: number) {
  return ACCESS_GROUPS.slice(0, groupIndex).reduce((total, group) => total + group.length, 0) + slotIndex;
}

export function AccessGate({ onGuestAccess, onArchivistAccess }: AccessGateProps) {
  const [values, setValues] = useState(makeInitialValues);
  const [error, setError] = useState("");
  const [archivistDoorOpen, setArchivistDoorOpen] = useState(false);
  const [username, setUsername] = useState("Archivist_Z");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const submittedCode = useMemo(() => values.map((group) => group.join("-")).join(" "), [values]);

  function setSlot(groupIndex: number, slotIndex: number, value: string) {
    const expectedLength = ACCESS_GROUPS[groupIndex][slotIndex].length;
    const cleaned = value.replace(/\D/g, "").slice(0, expectedLength);
    setValues((current) =>
      current.map((group, currentGroupIndex) =>
        group.map((slot, currentSlotIndex) =>
          currentGroupIndex === groupIndex && currentSlotIndex === slotIndex ? cleaned : slot,
        ),
      ),
    );
    setError("");

    if (cleaned.length === expectedLength) {
      const nextInput = inputsRef.current[flattenIndex(groupIndex, slotIndex) + 1];
      nextInput?.focus();
    }
  }

  function fillFromCode(value: string) {
    const tokens = value.match(/\d+/g) ?? [];
    if (!tokens.length) {
      return;
    }

    let tokenIndex = 0;
    setValues(
      ACCESS_GROUPS.map((group) =>
        group.map((slot) => {
          const token = tokens[tokenIndex] ?? "";
          tokenIndex += 1;
          return token.slice(0, slot.length);
        }),
      ),
    );
    setError("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, groupIndex: number, slotIndex: number) {
    if (event.key !== "Backspace") {
      return;
    }

    if (values[groupIndex][slotIndex]) {
      return;
    }

    const previousInput = inputsRef.current[flattenIndex(groupIndex, slotIndex) - 1];
    previousInput?.focus();
  }

  function clearCode() {
    setValues(makeInitialValues());
    setError("");
    inputsRef.current[0]?.focus();
  }

  function handleRiddleSubmit(event: FormEvent) {
    event.preventDefault();

    if (submittedCode === ACCESS_CODE) {
      setArchivistDoorOpen(true);
      setError("");
      return;
    }

    setError("Access phrase rejected. The clock has not found Monday morning.");
  }

  function handleArchivistSubmit(event: FormEvent) {
    event.preventDefault();

    const session = onArchivistAccess(username, password);

    if (!session) {
      setError("Archivist credential rejected. The reliquary will not sign this hand.");
      return;
    }

    setError("");
  }

  return (
    <div className="access-overlay" role="presentation">
      <form
        className={archivistDoorOpen ? "access-window archivist-mode" : "access-window"}
        onSubmit={archivistDoorOpen ? handleArchivistSubmit : handleRiddleSubmit}
        aria-labelledby="access-title"
      >
        <div className="access-sigil" aria-hidden="true">
          {archivistDoorOpen ? <ShieldCheck size={30} /> : <LockKeyhole size={30} />}
        </div>
        <header>
          <h2 id="access-title">{archivistDoorOpen ? "Archivist Login" : "Password Access"}</h2>
          {!archivistDoorOpen ? (
            <>
              <p className="access-mirror-clue">{MIRROR_MESSAGE}</p>
              <p>{ACCESS_MESSAGE}</p>
            </>
          ) : (
            <p>Three Archivist accounts stand behind the solved wall. Guests remain view-only.</p>
          )}
        </header>

        {!archivistDoorOpen ? (
          <div className="access-code" aria-label="Numeric password code">
            {ACCESS_GROUPS.map((group, groupIndex) => (
              <div className="access-word" key={`group-${groupIndex}`}>
                {group.map((slot, slotIndex) => {
                  const flatIndex = flattenIndex(groupIndex, slotIndex);
                  return (
                    <span className="access-token" key={`slot-${groupIndex}-${slotIndex}`}>
                      <input
                        ref={(input) => {
                          inputsRef.current[flatIndex] = input;
                        }}
                        value={values[groupIndex][slotIndex]}
                        onChange={(event) => setSlot(groupIndex, slotIndex, event.target.value)}
                        onPaste={(event) => {
                          event.preventDefault();
                          fillFromCode(event.clipboardData.getData("text"));
                        }}
                        onKeyDown={(event) => handleKeyDown(event, groupIndex, slotIndex)}
                        autoFocus={flatIndex === 0}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={slot.length}
                        placeholder={"0".repeat(slot.length)}
                        aria-label={`Password number ${flatIndex + 1}`}
                      />
                      {slotIndex < group.length - 1 ? (
                        <span className="access-dash" aria-hidden="true">
                          -
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
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
                  onChange={(event) => setPassword(event.target.value)}
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
        )}

        <div className="access-actions">
          {!archivistDoorOpen ? (
            <button type="button" onClick={clearCode}>
              <RefreshCcw size={16} />
              Clear
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setArchivistDoorOpen(false);
                setError("");
              }}
            >
              <RefreshCcw size={16} />
              Riddle
            </button>
          )}
          <button type="button" onClick={onGuestAccess}>
            <UserRound size={16} />
            Guest View
          </button>
          <button type="submit" className="access-submit">
            <Unlock size={16} />
            {archivistDoorOpen ? "Enter" : "Unlock"}
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
