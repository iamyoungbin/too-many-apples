import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable(
  'rooms',
  {
    id: text('id').primaryKey(),
    state: text('state').notNull(),
    revision: integer('revision').notNull().default(0),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [index('idx_rooms_expires_at').on(table.expiresAt)],
);
