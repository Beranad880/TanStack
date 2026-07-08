import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey(),
  text: text('text').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const protocols = sqliteTable('protocols', {
  id: integer('id').primaryKey(),
  timestamp: text('timestamp').$defaultFn(() => new Date().toISOString()),
  status: text('status').notNull(), // 'success' | 'failed'
  ip: text('ip'),
  userAgent: text('user_agent'),
  details: text('details').notNull(),
});

export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  costUsd: real('cost_usd').notNull(),
  createdAt: text('created_at').notNull(),
});

export const brandProfiles = sqliteTable('brand_profiles', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  companyName: text('company_name').notNull(),
  description: text('description').notNull(),
  targetAudience: text('target_audience').notNull(),
  valueProposition: text('value_proposition').notNull(),
  toneOfVoice: text('tone_of_voice').notNull(),
  colorPalette: text('color_palette').notNull(), // string[] JSON string
  candidateImages: text('candidate_images').notNull(), // string[] JSON string
  createdAt: text('created_at').notNull(),
});

export const ads = sqliteTable('ads', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  creativeIdea: text('creative_idea').notNull(),
  primaryText: text('primary_text').notNull(),
  headline: text('headline').notNull(),
  description: text('description').notNull(),
  cta: text('cta').notNull(),
  imageUrl: text('image_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
