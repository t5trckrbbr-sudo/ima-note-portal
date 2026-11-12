import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const questions = sqliteTable('questions', {
 id: text('id').primaryKey(), title: text('title').notNull(), body: text('body').notNull(),
 category: text('category').notNull(), timeframe: text('timeframe').notNull(), author: text('author').notNull(),
 keyHash: text('key_hash').notNull(), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(), deletedAt: text('deleted_at'),
},t=>[index('questions_updated_idx').on(t.updatedAt)]);
export const answers = sqliteTable('answers', {
 id:text('id').primaryKey(),questionId:text('question_id').notNull(),body:text('body').notNull(),author:text('author').notNull(),kind:text('kind').notNull(),
 sourceUrl:text('source_url').notNull(),sourceTitle:text('source_title').notNull(),observedAt:text('observed_at').notNull(),keyHash:text('key_hash').notNull(),
 revision:integer('revision').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),deletedAt:text('deleted_at'),
},t=>[index('answers_question_idx').on(t.questionId,t.deletedAt)]);
export const answerRevisions = sqliteTable('answer_revisions', {
 id:text('id').primaryKey(),answerId:text('answer_id').notNull(),revision:integer('revision').notNull(),body:text('body').notNull(),author:text('author').notNull(),kind:text('kind').notNull(),
 sourceUrl:text('source_url').notNull(),sourceTitle:text('source_title').notNull(),observedAt:text('observed_at').notNull(),editedAt:text('edited_at').notNull(),
},t=>[uniqueIndex('answer_revision_unique').on(t.answerId,t.revision)]);
export const writeLimits=sqliteTable('write_limits',{id:text('id').primaryKey(),window:integer('window').notNull(),count:integer('count').notNull()});
