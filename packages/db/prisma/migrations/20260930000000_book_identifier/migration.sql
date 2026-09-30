-- CreateTable
CREATE TABLE "book_identifier" (
    "book_id" TEXT NOT NULL,
    "scheme" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    PRIMARY KEY ("book_id", "scheme", "value"),
    CONSTRAINT "book_identifier_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shelf_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "path_key" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'reflowable',
    "size" BIGINT NOT NULL DEFAULT 0,
    "mtime" BIGINT NOT NULL DEFAULT 0,
    "hash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_key" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT,
    "publisher_id" TEXT,
    "language" TEXT,
    "published" TEXT,
    "series_id" TEXT,
    "series_index" REAL,
    "description" TEXT,
    "sections" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "note" TEXT,
    "rating" INTEGER,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "cover_file" TEXT,
    "missing" BOOLEAN NOT NULL DEFAULT false,
    "search_text" TEXT NOT NULL DEFAULT '',
    "added_at" TEXT NOT NULL,
    "scanned_at" TEXT NOT NULL,
    "last_opened_at" TEXT,
    CONSTRAINT "book_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publisher" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "book_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_book" ("added_at", "category", "cover_file", "description", "favorite", "format", "hash", "id", "language", "last_opened_at", "layout", "missing", "mtime", "note", "path", "path_key", "published", "publisher_id", "rating", "scanned_at", "search_text", "sections", "series_id", "series_index", "shelf_id", "size", "subtitle", "title", "title_key") SELECT "added_at", "category", "cover_file", "description", "favorite", "format", "hash", "id", "language", "last_opened_at", "layout", "missing", "mtime", "note", "path", "path_key", "published", "publisher_id", "rating", "scanned_at", "search_text", "sections", "series_id", "series_index", "shelf_id", "size", "subtitle", "title", "title_key" FROM "book";
DROP TABLE "book";
ALTER TABLE "new_book" RENAME TO "book";
CREATE INDEX "book_shelf_id_category_idx" ON "book"("shelf_id", "category");
CREATE INDEX "book_shelf_id_format_idx" ON "book"("shelf_id", "format");
CREATE INDEX "book_shelf_id_rating_idx" ON "book"("shelf_id", "rating");
CREATE INDEX "book_shelf_id_title_key_idx" ON "book"("shelf_id", "title_key");
CREATE INDEX "book_publisher_id_idx" ON "book"("publisher_id");
CREATE INDEX "book_series_id_series_index_idx" ON "book"("series_id", "series_index");
CREATE UNIQUE INDEX "book_shelf_id_path_key_key" ON "book"("shelf_id", "path_key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "book_identifier_scheme_value_idx" ON "book_identifier"("scheme", "value");

