import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const protocols = sqliteTable('protocols', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: text('timestamp').$defaultFn(() => new Date().toISOString()),
  status: text('status').notNull(), // 'success' | 'failed'
  ip: text('ip'),
  userAgent: text('user_agent'),
  details: text('details').notNull(),
});
