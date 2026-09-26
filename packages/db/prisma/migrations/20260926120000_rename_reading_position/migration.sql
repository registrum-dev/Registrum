-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "reading_position" (
    "book_id" TEXT NOT NULL PRIMARY KEY,
    "cfi" TEXT NOT NULL,
    "fraction" REAL NOT NULL DEFAULT 0,
    "label" TEXT,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "reading_position_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "reading_position" ("book_id", "cfi", "fraction", "label", "updated_at") SELECT "book_id", "cfi", "fraction", "label", "updated_at" FROM "reading_state";
DROP TABLE "reading_state";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RenameColumn
ALTER TABLE "book" RENAME COLUMN "indexed_at" TO "scanned_at";
