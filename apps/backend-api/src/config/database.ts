import postgres, { type Sql } from 'postgres'
import type { Environment } from './environment.js'

let sql: Sql | null = null

export function getDb(env: Environment): Sql {
  if (!sql) {
    const url = env.DATABASE_URL || process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL is required for server-side Postgres queries.')
    }
    sql = postgres(url, {
      max: 5,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  }
  return sql
}
