import psycopg2
import pandas as pd

conn = psycopg2.connect(
    dbname="cricai",
    user="postgres",
    password="Hahahaa!1",
    host="localhost",
    port="5432"
)

# Inspect column names in matches table
df_cols = pd.read_sql("SELECT column_name FROM information_schema.columns WHERE table_name = 'matches';", conn)
print("Matches columns:", df_cols['column_name'].tolist())

# Inspect distinct match types and counts
df_types = pd.read_sql("""
    SELECT match_type, COUNT(*) as match_count 
    FROM matches 
    GROUP BY match_type 
    ORDER BY match_count DESC;
""", conn)
print("\n=== Match Type Distribution ===")
print(df_types.to_string(index=False))

# Check gender / division column if present
for col in ['gender', 'division', 'event_name']:
    if col in df_cols['column_name'].tolist():
        df_sub = pd.read_sql(f"SELECT {col}, COUNT(*) FROM matches GROUP BY {col} LIMIT 10;", conn)
        print(f"\n=== Values for '{col}' ===")
        print(df_sub.to_string(index=False))

conn.close()
