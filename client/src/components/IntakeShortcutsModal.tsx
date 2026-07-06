import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import {
  DEFAULT_INTAKE_SHORTCUTS,
  findShortcutConflicts,
  formatShortcutBinding,
  INTAKE_SHORTCUT_LABELS,
  type IntakeShortcutAction,
  type IntakeShortcutBinding,
  type IntakeShortcutMap,
} from "../utils/intakeShortcuts";

const ACTION_ORDER: IntakeShortcutAction[] = [
  "playPause",
  "frameBack",
  "frameForward",
  "jumpBack",
  "jumpForward",
  "seekBack5",
  "seekForward5",
  "seekBack15",
  "seekForward15",
  "addLap",
  "addSplit",
  "removeMarker",
];

interface IntakeShortcutsModalProps {
  open: boolean;
  shortcuts: IntakeShortcutMap;
  onClose: () => void;
  onSave: (shortcuts: IntakeShortcutMap) => void;
}

export function IntakeShortcutsModal({
  open,
  shortcuts,
  onClose,
  onSave,
}: IntakeShortcutsModalProps) {
  const [draft, setDraft] = useState<IntakeShortcutMap>(shortcuts);
  const [recordingAction, setRecordingAction] = useState<IntakeShortcutAction | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(shortcuts);
      setRecordingAction(null);
    }
  }, [open, shortcuts]);

  useEffect(() => {
    if (!open || recordingAction == null) return;
    const capturingAction = recordingAction;

    function onKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setRecordingAction(null);
        return;
      }

      const binding = bindingFromEvent(event);
      if (!binding) return;

      setDraft((prev) => ({ ...prev, [capturingAction]: binding }));
      setRecordingAction(null);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, recordingAction]);

  const conflicts = findShortcutConflicts(draft);

  function handleSave() {
    if (conflicts.length > 0) return;
    onSave(draft);
    onClose();
  }

  function handleReset() {
    setDraft({ ...DEFAULT_INTAKE_SHORTCUTS });
    setRecordingAction(null);
  }

  return (
    <Modal open={open} title="Keyboard shortcuts" onClose={onClose}>
      <p className="intake-shortcuts-modal-lead">
        Click a shortcut field, then press the key combination you want. Escape cancels capture.
      </p>

      <div className="intake-shortcuts-table-wrap">
        <table className="intake-shortcuts-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {ACTION_ORDER.map((action) => (
              <tr key={action}>
                <td>{INTAKE_SHORTCUT_LABELS[action]}</td>
                <td>
                  <button
                    type="button"
                    className={`intake-shortcut-capture ${
                      recordingAction === action ? "intake-shortcut-capture--recording" : ""
                    }`}
                    onClick={() => setRecordingAction(action)}
                  >
                    {recordingAction === action
                      ? "Press keys…"
                      : formatShortcutBinding(draft[action])}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conflicts.length > 0 && (
        <ul className="intake-shortcuts-conflicts">
          {conflicts.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <div className="intake-shortcuts-modal-actions">
        <button type="button" className="btn btn-secondary" onClick={handleReset}>
          Reset defaults
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={conflicts.length > 0}
        >
          Save shortcuts
        </button>
      </div>
    </Modal>
  );
}

function bindingFromEvent(event: KeyboardEvent): IntakeShortcutBinding | null {
  if (event.key === "Tab") return null;

  const modifiers: IntakeShortcutBinding["modifiers"] = {};
  if (event.shiftKey) modifiers.shift = true;
  if (event.ctrlKey) modifiers.ctrl = true;
  if (event.altKey) modifiers.alt = true;

  if (event.key === " " || event.code === "Space") {
    return { key: "Space", modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined };
  }

  if (event.key.startsWith("Arrow")) {
    return { key: event.key, modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined };
  }

  if (event.key.length === 1) {
    return { key: event.key.toLowerCase(), modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined };
  }

  if (event.code.startsWith("Bracket")) {
    const key = event.code === "BracketLeft" ? "[" : "]";
    return { key, modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined };
  }

  if (event.key === "Delete" || event.code === "Delete") {
    return { key: "Delete", modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined };
  }

  return null;
}
