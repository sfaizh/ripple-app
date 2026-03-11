import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  json,
} from 'drizzle-orm/pg-core';

export const themeEnum = pgEnum('theme', ['default', 'sunset', 'ocean']);

export const categoryEnum = pgEnum('category', [
  'professional',
  'creative',
  'personal_growth',
  'just_because',
]);

export const clueTypeEnum = pgEnum('clue_type', [
  'linkedin',
  'company',
  'recent',
  'generic',
]);

export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending',
  'approved',
  'rejected',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  // Preferences
  theme: themeEnum('theme').notNull().default('default'),
  emailNotifications: boolean('email_notifications').notNull().default(true),

  // Stats (denormalized for performance)
  currentStreak: integer('current_streak').notNull().default(0),
  totalSent: integer('total_sent').notNull().default(0),
  totalReceived: integer('total_received').notNull().default(0),
});

export const compliments = pgTable(
  'compliments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationships
    senderId: uuid('sender_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Content
    category: categoryEnum('category').notNull(),
    message: varchar('message', { length: 280 }).notNull(),

    // Clue system
    clueType: clueTypeEnum('clue_type').notNull().default('generic'),
    clueText: varchar('clue_text', { length: 255 }),

    // Moderation
    moderationStatus: moderationStatusEnum('moderation_status')
      .notNull()
      .default('pending'),
    moderationResult: json('moderation_result'),

    // Read tracking
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at'),

    // Public display
    isPublic: boolean('is_public').notNull().default(true),

    // Threading (Phase 2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parentId: uuid('parent_id').references((): any => compliments.id, {
      onDelete: 'cascade',
    }),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('compliments_recipient_id_idx').on(table.recipientId),
    index('compliments_created_at_idx').on(table.createdAt),
    index('compliments_moderation_status_idx').on(table.moderationStatus),
    index('compliments_is_public_idx').on(table.isPublic),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Compliment = typeof compliments.$inferSelect;
export type NewCompliment = typeof compliments.$inferInsert;
