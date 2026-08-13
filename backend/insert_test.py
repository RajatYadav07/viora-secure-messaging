import sqlite3
import datetime

conn = sqlite3.connect('signal.db')
cur = conn.cursor()
cur.execute("INSERT INTO messages (conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?)", (1, 1, 'UI RENDER TEST STRING', datetime.datetime.now(datetime.timezone.utc)))
conn.commit()
print('Inserted UI RENDER TEST STRING')
