import { spawnSync } from "node:child_process";
import fs from "node:fs";

const VIDEO_FILTER =
  "Video files|*.mp4;*.MP4;*.mov;*.MOV;*.mkv;*.MKV;*.m4v;*.M4V|All files|*.*";

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Opens the Windows file picker and returns the selected absolute path, or null if cancelled.
 * Requires an interactive desktop session (local dev use).
 */
export function pickVideoFile(initialDir?: string): string | null {
  if (process.platform !== "win32") {
    throw Object.assign(
      new Error("Native file picker is only available on Windows"),
      { code: "UNSUPPORTED_PLATFORM" },
    );
  }

  const dir =
    initialDir && fs.existsSync(initialDir) ? pathToWindows(initialDir) : undefined;

  const lines = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.OpenFileDialog",
    `$dialog.Filter = '${VIDEO_FILTER}'`,
    "$dialog.Title = 'Select video file'",
  ];

  if (dir) {
    lines.push(`$dialog.InitialDirectory = '${escapePowerShellSingleQuoted(dir)}'`);
  }

  lines.push(
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  Write-Output $dialog.FileName",
    "}",
  );

  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-STA", "-Command", lines.join("; ")],
    {
      encoding: "utf-8",
      timeout: 120_000,
      windowsHide: false,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const detail = (result.stderr ?? "").trim();
    throw new Error(detail || "File picker failed");
  }

  const output = (result.stdout ?? "").trim();
  return output || null;
}

/**
 * Opens the Windows folder picker and returns the selected absolute path, or null if cancelled.
 */
export function pickFolder(initialDir?: string): string | null {
  if (process.platform !== "win32") {
    throw Object.assign(
      new Error("Native folder picker is only available on Windows"),
      { code: "UNSUPPORTED_PLATFORM" },
    );
  }

  const dir =
    initialDir && fs.existsSync(initialDir) ? pathToWindows(initialDir) : undefined;

  const lines = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = 'Select default video folder'",
  ];

  if (dir) {
    lines.push(`$dialog.SelectedPath = '${escapePowerShellSingleQuoted(dir)}'`);
  }

  lines.push(
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  Write-Output $dialog.SelectedPath",
    "}",
  );

  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-STA", "-Command", lines.join("; ")],
    {
      encoding: "utf-8",
      timeout: 120_000,
      windowsHide: false,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const detail = (result.stderr ?? "").trim();
    throw new Error(detail || "Folder picker failed");
  }

  const output = (result.stdout ?? "").trim();
  return output || null;
}

function pathToWindows(value: string): string {
  return value.replace(/\//g, "\\");
}
