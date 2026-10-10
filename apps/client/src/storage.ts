import { saveSchema, type SaveData } from '@eldoria/domain';
export const SAVE_KEY = 'eldoria.offline.v1';
export const BACKUP_KEY = `${SAVE_KEY}.backup`;
export interface StorageAccess { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface SaveStatus { data?: SaveData; backup?: SaveData; error?: string }
export class OfflineStorage {
  constructor(private storage: StorageAccess, private validate: (input: unknown) => SaveData = input => saveSchema.parse(input)) {}
  private parse(raw: string | null): SaveData | undefined { return raw === null ? undefined : this.validate(JSON.parse(raw)); }
  load(): SaveStatus {
    let data: SaveData | undefined, backup: SaveData | undefined, error: string | undefined;
    try { data = this.parse(this.storage.getItem(SAVE_KEY)); }
    catch { error = 'Zapis jest uszkodzony, nieobsługiwany lub pamięć jest niedostępna. Dane pozostają zachowane.'; }
    try { backup = this.parse(this.storage.getItem(BACKUP_KEY)); } catch { /* Keep the original backup for manual recovery. */ }
    return { data, backup, error };
  }
  write(data: SaveData, explicitRecovery = false): string | undefined {
    try {
      const raw = JSON.stringify(this.validate(data));
      const previous = this.storage.getItem(SAVE_KEY);
      let valid: SaveData | undefined;
      try { valid = this.parse(previous); }
      catch {
        if (!explicitRecovery) return 'Uszkodzony zapis zachowany. Wybierz odzyskanie lub import w menu.';
        if (previous !== null) this.storage.setItem(`${SAVE_KEY}.damaged`, previous);
      }
      if (valid && previous !== null && previous !== raw) this.storage.setItem(BACKUP_KEY, previous);
      this.storage.setItem(SAVE_KEY, raw);
      return undefined;
    } catch { return 'Nie udało się zapisać: brak miejsca lub dostęp do pamięci zablokowany. Wyeksportuj zapis.'; }
  }
}
