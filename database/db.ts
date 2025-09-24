// db.ts
import * as SQLite from "expo-sqlite"
import { SQLiteDatabase } from "expo-sqlite"

export async function openDatabase(name: string = "app.db"): Promise<SQLiteDatabase> {
  // This uses the async open variant (docs) — returns a promise
  const db = await SQLite.openDatabaseAsync(name)
  return db
}
