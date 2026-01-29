/**
 * Discord Session Manager
 * Handles game session persistence using SQLite
 */

import Database from 'better-sqlite3';
import { GameSession } from '../core/game-session.js';
import { Character } from '../core/character.js';
import { Party } from '../core/party.js';

export class SessionManager {
    constructor(dbPath = './data/sessions.db') {
        this.db = new Database(dbPath);
        this.initializeDatabase();
        this.sessions = new Map(); // In-memory cache: channelId -> GameSession
    }

    initializeDatabase() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                channel_id TEXT PRIMARY KEY,
                host_id TEXT NOT NULL,
                game_state TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_activity TEXT NOT NULL
            )
        `);
    }

    /**
     * Create a new game session for a channel
     * @param {string} channelId
     * @param {string} hostId
     * @param {string} hostName
     * @returns {GameSession}
     */
    createSession(channelId, hostId, hostName) {
        // Check if session already exists
        if (this.sessions.has(channelId)) {
            throw new Error('A game is already active in this channel');
        }

        const session = new GameSession({
            sessionId: channelId,
            isMultiplayer: true,
            useApiNames: true
        });
        
        session.addPlayer(hostId, hostName);
        
        this.sessions.set(channelId, session);
        this.saveSession(channelId, session);
        
        return session;
    }

    /**
     * Get session for a channel
     * @param {string} channelId
     * @returns {GameSession|null}
     */
    getSession(channelId) {
        // Try memory cache first
        if (this.sessions.has(channelId)) {
            return this.sessions.get(channelId);
        }

        // Try loading from database
        const row = this.db.prepare('SELECT game_state FROM sessions WHERE channel_id = ?').get(channelId);
        if (row) {
            const session = GameSession.fromJSON(JSON.parse(row.game_state));
            this.sessions.set(channelId, session);
            return session;
        }

        return null;
    }

    /**
     * Save session to database
     * @param {string} channelId
     * @param {GameSession} session
     */
    saveSession(channelId, session) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO sessions (channel_id, host_id, game_state, created_at, last_activity)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            channelId,
            session.hostId,
            JSON.stringify(session.toJSON()),
            session.createdAt.toISOString(),
            session.lastActivity.toISOString()
        );
    }

    /**
     * Delete session
     * @param {string} channelId
     */
    deleteSession(channelId) {
        this.sessions.delete(channelId);
        this.db.prepare('DELETE FROM sessions WHERE channel_id = ?').run(channelId);
    }

    /**
     * Check if channel has active session
     * @param {string} channelId
     * @returns {boolean}
     */
    hasSession(channelId) {
        return this.getSession(channelId) !== null;
    }

    /**
     * Get all active sessions (for cleanup)
     * @returns {Array}
     */
    getAllSessions() {
        return this.db.prepare('SELECT channel_id, host_id, last_activity FROM sessions').all();
    }

    /**
     * Clean up stale sessions (older than specified hours)
     * @param {number} hours
     */
    cleanupStaleSessions(hours = 24) {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        const stale = this.db.prepare('SELECT channel_id FROM sessions WHERE last_activity < ?').all(cutoff);
        
        for (const row of stale) {
            this.deleteSession(row.channel_id);
        }
        
        return stale.length;
    }

    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
}

export default SessionManager;
