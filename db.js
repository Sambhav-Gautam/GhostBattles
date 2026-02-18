const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Initialize DB
const dbPath = path.join(__dirname, 'game.db');
const db = new Database(dbPath);

// Create Table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Helpers ──
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// ── API ──
const API = {
    createUser: (username, password) => {
        try {
            const id = crypto.randomUUID();
            const hash = hashPassword(password);
            const stmt = db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)');
            stmt.run(id, username, hash);
            return { success: true, id, username };
        } catch (err) {
            console.error('Create User Error:', err);
            return { success: false, error: 'Username already taken' };
        }
    },

    loginUser: (username, password) => {
        try {
            const hash = hashPassword(password);
            const stmt = db.prepare('SELECT id, username, kills, deaths, wins FROM users WHERE username = ? AND password_hash = ?');
            const user = stmt.get(username, hash);
            if (!user) return { success: false, error: 'Invalid credentials' };
            return { success: true, user };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    updateStats: (id, kills, deaths, wins) => {
        try {
            const stmt = db.prepare('UPDATE users SET kills = kills + ?, deaths = deaths + ?, wins = wins + ? WHERE id = ?');
            stmt.run(kills || 0, deaths || 0, wins || 0, id);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getLeaderboard: () => {
        const stmt = db.prepare('SELECT username, kills, wins FROM users ORDER BY kills DESC LIMIT 10');
        return stmt.all();
    }
};

module.exports = API;
