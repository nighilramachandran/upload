import path from "path";
import { execSync } from "child_process";

/**
 * Detect if a file or folder is hidden (cross-platform)
 */
export function isHidden(fullPath: string): boolean {
  const base = path.basename(fullPath);

  if (base.startsWith(".")) return true;

  // Windows hidden flag
  if (process.platform === "win32") {
    try {
      const output = execSync(`attrib "${fullPath}"`).toString();
      return output.includes("H");
    } catch {
      return false;
    }
  }

  return false;
}
