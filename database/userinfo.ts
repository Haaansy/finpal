// userinfo.ts
import { SQLiteDatabase } from "expo-sqlite"
import { openDatabase } from "./db"

async function ensureTable(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS userinfo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

export async function addUser(name: string) {
  const db = await openDatabase()
  await ensureTable(db)

  try {
    // You can use runAsync for simple writes
    const result = await db.runAsync(
      "INSERT INTO userinfo (name) VALUES (?);",
      name
    )
    
    return result.lastInsertRowId
  } catch (error) {
    return `error: ${error}`
  }
}

// Fetch the first (and only) user from userinfo
const getUser = async () => {
  const db = await openDatabase()

  try {
    const result = await db.getFirstAsync<{
      id: number
      name: string
      created_at: string
    }>('SELECT * FROM userinfo LIMIT 1')

    return result // either an object or undefined if no rows
  } catch (error) {
    return null
  }
}

export { getUser }

