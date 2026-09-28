-- CreateTable
CREATE TABLE "bookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "book_id" TEXT NOT NULL,
    "cfi" TEXT NOT NULL,
    "fraction" REAL NOT NULL DEFAULT 0,
    "label" TEXT,
    "created_at" TEXT NOT NULL,
    CONSTRAINT "bookmark_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "bookmark_book_id_idx" ON "bookmark"("book_id");
