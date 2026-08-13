import sqlite3
conn = sqlite3.connect('signal.db')
cur = conn.cursor()
cur.execute("SELECT id, content FROM messages ORDER BY id DESC LIMIT 5")
print(cur.fetchall())
cur.execute("SELECT sql FROM sqlite_master WHERE type='trigger'")
print("Triggers:", cur.fetchall())
