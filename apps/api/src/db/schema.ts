import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════

export const aiProviderEnum = pgEnum('ai_provider', [
  'openai', 'anthropic', 'gemini', 'deepseek', 'groq', 'ollama',
]);

export const fileTypeEnum = pgEnum('file_type', ['file', 'directory']);

export const permissionEnum = pgEnum('permission', ['read', 'write', 'admin']);

export const aiActionTypeEnum = pgEnum('ai_action_type', [
  'chat', 'inline_edit', 'explain', 'fix_error', 'generate',
]);

// ═══════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  githubId: text('github_id').notNull().unique(),
  githubUsername: varchar('github_username', { length: 100 }),
  githubAccessToken: text('github_access_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// SESSIONS
// ═══════════════════════════════════════════════════════════

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 512 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// SSH KEYS
// ═══════════════════════════════════════════════════════════

export const sshKeys = pgTable('ssh_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  publicKey: text('public_key').notNull(),
  privateKeyEncrypted: text('private_key_encrypted').notNull(),
  fingerprint: varchar('fingerprint', { length: 64 }).notNull().unique(),
  githubKeyId: integer('github_key_id'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  template: varchar('template', { length: 50 }),
  isPublic: boolean('is_public').default(false),
  isFavorite: boolean('is_favorite').default(false),
  githubRepo: text('github_repo'),
  settings: jsonb('settings').$type<{
    theme?: string;
    fontSize?: number;
    tabSize?: number;
    autoSave?: boolean;
  }>(),
  lastOpenedAt: timestamp('last_opened_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// PROJECT SHARES
// ═══════════════════════════════════════════════════════════

export const projectShares = pgTable('project_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  sharedWithUserId: uuid('shared_with_user_id').references(() => users.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').unique(),
  permission: permissionEnum('permission').default('read').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// FILES
// ═══════════════════════════════════════════════════════════

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    path: varchar('path', { length: 1024 }).notNull(),
    content: text('content'),
    type: fileTypeEnum('type').default('file').notNull(),
    sizeBytes: integer('size_bytes').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    projectPathIdx: uniqueIndex('project_path_idx').on(table.projectId, table.path),
  }),
);

// ═══════════════════════════════════════════════════════════
// FILE VERSIONS
// ═══════════════════════════════════════════════════════════

export const fileVersions = pgTable('file_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').references(() => files.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// AI SETTINGS (ONE-TO-ONE)
// ═══════════════════════════════════════════════════════════

export const aiSettings = pgTable('ai_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  provider: aiProviderEnum('provider').default('openai').notNull(),
  apiKeyEncrypted: text('api_key_encrypted'),
  model: varchar('model', { length: 100 }),
  enableStreaming: boolean('enable_streaming').default(true),
  maxContextTokens: integer('max_context_tokens').default(4096),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// AI PROVIDER KEYS
// ═══════════════════════════════════════════════════════════

export const aiProviderKeys = pgTable('ai_provider_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: aiProviderEnum('provider').notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// AI HISTORY
// ═══════════════════════════════════════════════════════════

export const aiHistory = pgTable('ai_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  actionType: aiActionTypeEnum('action_type').notNull(),
  prompt: text('prompt').notNull(),
  response: text('response'),
  tokensUsed: integer('tokens_used'),
  modelUsed: varchar('model_used', { length: 100 }),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  files: jsonb('files').$type<{
    path: string;
    content: string;
    type: 'file' | 'directory';
  }[]>().notNull(),
  dependencies: jsonb('dependencies').$type<Record<string, string>>(),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════════════════════════

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  projects: many(projects),
  sshKeys: many(sshKeys),
  aiSettings: one(aiSettings),
  aiProviderKeys: many(aiProviderKeys),
  aiHistory: many(aiHistory),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  files: many(files),
  shares: many(projectShares),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  project: one(projects, { fields: [files.projectId], references: [projects.id] }),
  versions: many(fileVersions),
}));

export const fileVersionsRelations = relations(fileVersions, ({ one }) => ({
  file: one(files, {
    fields: [fileVersions.fileId],
    references: [files.id],
  }),
}));
