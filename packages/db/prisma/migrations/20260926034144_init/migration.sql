-- CreateTable
CREATE TABLE "book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shelf_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "path_key" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'reflowable',
    "size" BIGINT NOT NULL DEFAULT 0,
    "mtime" BIGINT NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "title_key" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT,
    "publisher_id" TEXT,
    "language" TEXT,
    "published" TEXT,
    "identifier" TEXT,
    "series_id" TEXT,
    "series_index" REAL,
    "description" TEXT,
    "sections" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "note" TEXT,
    "rating" INTEGER,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "cover" TEXT,
    "missing" BOOLEAN NOT NULL DEFAULT false,
    "search_text" TEXT NOT NULL DEFAULT '',
    "added_at" TEXT NOT NULL,
    "indexed_at" TEXT NOT NULL,
    "last_opened_at" TEXT,
    CONSTRAINT "book_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publisher" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "book_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reading_state" (
    "book_id" TEXT NOT NULL PRIMARY KEY,
    "cfi" TEXT NOT NULL,
    "fraction" REAL NOT NULL DEFAULT 0,
    "label" TEXT,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "reading_state_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "author" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shelf_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    CONSTRAINT "author_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "publisher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shelf_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    CONSTRAINT "publisher_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shelf_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    CONSTRAINT "series_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shelf_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    CONSTRAINT "collection_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shelf_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    CONSTRAINT "tag_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_author" (
    "book_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    PRIMARY KEY ("book_id", "author_id"),
    CONSTRAINT "book_author_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_author_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "author" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_collection" (
    "book_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    PRIMARY KEY ("book_id", "collection_id"),
    CONSTRAINT "book_collection_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_collection_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_tag" (
    "book_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    PRIMARY KEY ("book_id", "tag_id"),
    CONSTRAINT "book_tag_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "book_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "overview" TEXT NOT NULL DEFAULT '',
    "personality" TEXT NOT NULL DEFAULT '',
    "appearance" TEXT NOT NULL DEFAULT '',
    "speech" TEXT NOT NULL DEFAULT '',
    "affiliation" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "character_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "character_alias" (
    "character_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    PRIMARY KEY ("character_id", "position"),
    CONSTRAINT "character_alias_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "character_event" (
    "character_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    PRIMARY KEY ("character_id", "position"),
    CONSTRAINT "character_event_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "character_relation" (
    "book_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "from_id" TEXT NOT NULL,
    "to_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mutual" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("book_id", "position"),
    CONSTRAINT "character_relation_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "character_relation_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "character_relation_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shelf" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "book_shelf_id_category_idx" ON "book"("shelf_id", "category");

-- CreateIndex
CREATE INDEX "book_shelf_id_format_idx" ON "book"("shelf_id", "format");

-- CreateIndex
CREATE INDEX "book_shelf_id_rating_idx" ON "book"("shelf_id", "rating");

-- CreateIndex
CREATE INDEX "book_shelf_id_title_key_idx" ON "book"("shelf_id", "title_key");

-- CreateIndex
CREATE INDEX "book_publisher_id_idx" ON "book"("publisher_id");

-- CreateIndex
CREATE INDEX "book_series_id_series_index_idx" ON "book"("series_id", "series_index");

-- CreateIndex
CREATE UNIQUE INDEX "book_shelf_id_path_key_key" ON "book"("shelf_id", "path_key");

-- CreateIndex
CREATE UNIQUE INDEX "author_shelf_id_name_key" ON "author"("shelf_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "publisher_shelf_id_name_key" ON "publisher"("shelf_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "series_shelf_id_name_key" ON "series"("shelf_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "collection_shelf_id_name_key" ON "collection"("shelf_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tag_shelf_id_name_key" ON "tag"("shelf_id", "name");

-- CreateIndex
CREATE INDEX "book_author_author_id_idx" ON "book_author"("author_id");

-- CreateIndex
CREATE INDEX "book_collection_collection_id_idx" ON "book_collection"("collection_id");

-- CreateIndex
CREATE INDEX "book_tag_tag_id_idx" ON "book_tag"("tag_id");

-- CreateIndex
CREATE INDEX "character_book_id_position_idx" ON "character"("book_id", "position");

-- CreateIndex
CREATE INDEX "character_name_key_idx" ON "character"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "character_book_id_name_key" ON "character"("book_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_path_key" ON "shelf"("path");
