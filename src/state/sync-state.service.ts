import { Injectable, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'path';

/**
 * Service for managing sync state persistence using SQLite
 */
@Injectable()
export class SyncStateService implements OnModuleInit {
    private readonly database: InstanceType<typeof Database>;

    constructor() {
        const databasePath = path.join(process.cwd(), 'sync-state.db');
        this.database = new Database(databasePath);
    }

    onModuleInit() {
        this.initializeDatabase();
    }

    private initializeDatabase(): void {
        this.database.exec(`
            CREATE TABLE IF NOT EXISTS sync_state (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target TEXT NOT NULL UNIQUE,
                last_updated_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);
    }

    /**
     * Gets the last updated timestamp for a target channel
     */
    getLastSyncAt(target: string): string | null {
        const row = this.database
            .prepare('SELECT last_updated_at FROM sync_state WHERE target = ?')
            .get(target) as { last_updated_at: string | null } | undefined;

        return row?.last_updated_at ?? null;
    }

    /**
     * Records the most recent updated timestamp for a target channel
     */
    recordSyncBatch(
        target: string,
        records: Array<{ sku: string; lastUpdatedAt: string }>,
    ): void {
        if (records.length === 0) {
            return;
        }

        const mostRecent = records.reduce((max, record) => {
            return record.lastUpdatedAt > max ? record.lastUpdatedAt : max;
        }, records[0].lastUpdatedAt);

        const now = new Date().toISOString();
        this.database
            .prepare(
                `INSERT INTO sync_state (target, last_updated_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(target) DO UPDATE SET
                     last_updated_at = excluded.last_updated_at,
                     updated_at = excluded.updated_at`,
            )
            .run(target, mostRecent, now, now);
    }
}
