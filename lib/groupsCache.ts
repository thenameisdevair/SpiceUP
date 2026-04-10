import * as SQLite from "expo-sqlite";
import type { Group, Expense } from "./groups";

const db = SQLite.openDatabaseSync("spiceup_groups.db");

export function initGroupsDb(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cached_groups (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      data TEXT NOT NULL,
      synced_at INTEGER NOT NULL
    );
  `);
}

export function cacheGroups(groups: Group[]): void {
  const now = Date.now();
  for (const g of groups) {
    db.runSync(
      "INSERT OR REPLACE INTO cached_groups (id, data, synced_at) VALUES (?, ?, ?)",
      [g.id, JSON.stringify(g), now]
    );
  }
}

export function cacheExpenses(groupId: string, expenses: Expense[]): void {
  const now = Date.now();
  for (const e of expenses) {
    db.runSync(
      "INSERT OR REPLACE INTO cached_expenses (id, group_id, data, synced_at) VALUES (?, ?, ?, ?)",
      [e.id, groupId, JSON.stringify(e), now]
    );
  }
}

export function getCachedGroups(): Group[] {
  const rows = db.getAllSync<{ data: string }>(
    "SELECT data FROM cached_groups ORDER BY synced_at DESC"
  );
  return rows.map((r) => JSON.parse(r.data) as Group);
}

export function getCachedExpenses(groupId: string): Expense[] {
  const rows = db.getAllSync<{ data: string }>(
    "SELECT data FROM cached_expenses WHERE group_id = ? ORDER BY synced_at DESC",
    [groupId]
  );
  return rows.map((r) => JSON.parse(r.data) as Expense);
}
