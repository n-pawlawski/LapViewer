import { useCallback, useId, useRef, useState } from "react";
import {
  formatFileSize,
  isValidMp4File,
  mp4ValidationMessage,
} from "../utils/videoFileValidation";

type Props = {
  file: File | null;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
};

export function IntakeUploadZone({ file, disabled, onFileChange }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const validationError = mp4ValidationMessage(file);
  const isValid = file !== null && validationError === null;

  const applyFile = useCallback(
    (next: File | null) => {
      onFileChange(next);
    },
    [onFileChange],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    applyFile(picked);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files[0] ?? null;
    if (!dropped) return;
    applyFile(dropped);
  }

  return (
    <div className="intake-upload-zone">
      <div
        className={`intake-drop-target${dragOver ? " intake-drop-target--active" : ""}${
          file ? (isValid ? " intake-drop-target--valid" : " intake-drop-target--invalid") : ""
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".mp4,video/mp4"
          className="intake-drop-input"
          disabled={disabled}
          onChange={handleInputChange}
        />

        {file ? (
          <div className="intake-drop-file">
            <span className="intake-drop-file-name">{file.name}</span>
            <span className="intake-drop-file-meta">{formatFileSize(file.size)}</span>
            {validationError ? (
              <span className="intake-drop-file-error">{validationError}</span>
            ) : (
              <span className="intake-drop-file-ok">MP4 verified</span>
            )}
            {!disabled && (
              <button
                type="button"
                className="link-button intake-drop-change"
                onClick={() => inputRef.current?.click()}
              >
                Choose a different file
              </button>
            )}
          </div>
        ) : (
          <div className="intake-drop-empty">
            <p className="intake-drop-title">Drag and drop your GoPro video here</p>
            <p className="intake-drop-hint">MP4 only</p>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              Browse for file…
            </button>
          </div>
        )}
      </div>

      {!file && (
        <p className="field-hint intake-drop-footnote">
          Or click Browse to open the file picker on your PC.
        </p>
      )}
    </div>
  );
}

export { isValidMp4File };
