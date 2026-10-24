import psycopg2

try:
    conn = psycopg2.connect(
        dbname="cricai",
        user="postgres",
        password="Hahahaa!1",
        host="localhost",
        port="5432"
    )
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'deliveries' 
        ORDER BY ordinal_position;
    """)
    cols = cur.fetchall()
    print("=== DELIVERIES COLUMNS ===")
    for c in cols:
        print(f"  {c[0]}: {c[1]}")
    cur.close()
    conn.close()
except Exception as e:
    print("DATABASE ERROR:", e)
