import { Injectable, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'path';

/**
 * Service for managing sync state persistence using SQLite
 * Note: Each worker process has its own local database instance (sync-state.db)
 * This is intentional for the sharding model where workers are independent processes
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
     * @param target - Channel name (e.g., 'makro', 'woo')
     * @returns Last updated timestamp as ISO string, or null if no sync has occurred
     */
    getLastSyncAt(target: string): string | null {
        const row = this.database
            .prepare('SELECT last_updated_at FROM sync_state WHERE target = ?')
            .get(target) as { last_updated_at: string | null } | undefined;

        return row?.last_updated_at ?? null;
    }

    /**
     * Records a sync update timestamp (optimized for streaming)
     * Only updates if the new timestamp is more recent than the current one
     * Note: created_at is only set on INSERT, not updated on conflict (SQLite behavior)
     * @param target - Channel name (e.g., 'makro', 'woo')
     * @param lastUpdatedAt - ISO timestamp of the most recent product update
     */
    recordSyncUpdate(target: string, lastUpdatedAt: string): void {
        const current = this.getLastSyncAt(target);
        if (current && lastUpdatedAt <= current) {
            return;
        }

        const now = new Date().toISOString();
        this.database
            .prepare(
                `INSERT INTO sync_state (target, last_updated_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(target) DO UPDATE SET
                     last_updated_at = excluded.last_updated_at,
                     updated_at = excluded.updated_at`,
            )
            .run(target, lastUpdatedAt, now, now);
    }
}
