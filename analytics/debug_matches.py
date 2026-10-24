import psycopg2
import pandas as pd

conn = psycopg2.connect(
    dbname="cricai",
    user="postgres",
    password="Hahahaa!1",
    host="localhost",
    port="5432"
)

# 1. Check result_type values
df_res = pd.read_sql("SELECT DISTINCT result_type, COUNT(*) FROM matches GROUP BY result_type;", conn)
print("=== result_type values ===")
print(df_res.to_string(index=False))

# 2. Check match_type + women condition matching count
sql_counts = """
SELECT 
    m.match_type,
    CASE 
        WHEN (m.event_name ILIKE '%Women%' OR m.team1 ILIKE '%Women%' OR m.team2 ILIKE '%Women%') THEN 'WOMEN'
        ELSE 'MEN'
    END AS division,
    COUNT(*) as match_count,
    COUNT(m.winner) as count_with_winner
FROM matches m
GROUP BY m.match_type, division
ORDER BY match_type, division;
"""
df_div = pd.read_sql(sql_counts, conn)
print("\n=== Match Type x Division Breakdown ===")
print(df_div.to_string(index=False))

# 3. Check deliveries innings 2 count per match_type
sql_deliv = """
SELECT m.match_type, COUNT(DISTINCT d.match_id) as matches_with_inn2_deliveries
FROM deliveries d
JOIN matches m ON CAST(d.match_id AS VARCHAR) = CAST(m.match_id AS VARCHAR)
WHERE d.innings_number = 2
GROUP BY m.match_type;
"""
df_deliv = pd.read_sql(sql_deliv, conn)
print("\n=== Matches with Innings 2 Deliveries ===")
print(df_deliv.to_string(index=False))

conn.close()
