import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

/** 书籍 */
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull().default("未知作者"),
  format: text("format").notNull().default("md"), // md | txt
  coverHue: integer("cover_hue").notNull().default(222),
  wordCount: integer("word_count").notNull().default(0),
  chapterCount: integer("chapter_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

/** 章节 */
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  orderIndex: integer("order_index").notNull(),
  wordCount: integer("word_count").notNull().default(0),
});

/** 阅读进度（每本书一条） */
export const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id")
    .notNull()
    .unique()
    .references(() => books.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").notNull(),
  scrollRatio: real("scroll_ratio").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** 书签 */
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").notNull(),
  scrollRatio: real("scroll_ratio").notNull().default(0),
  excerpt: text("excerpt").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** 全局设置（单行 JSON） */
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** 用户导入的字体（base64 存储） */
export const fonts = pgTable("fonts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  mime: text("mime").notNull(),
  dataBase64: text("data_base64").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
