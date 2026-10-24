import psycopg2

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS player_career_summaries (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(100) NOT NULL,
    cricsheet_name VARCHAR(100) NOT NULL,
    format VARCHAR(20) NOT NULL, -- 'T20I', 'ODI', 'Test', 'IPL'
    matches INT DEFAULT 0,
    innings_batted INT DEFAULT 0,
    runs_scored INT DEFAULT 0,
    batting_avg NUMERIC(6,2) DEFAULT 0.0,
    strike_rate NUMERIC(6,2) DEFAULT 0.0,
    hundreds INT DEFAULT 0,
    fifties INT DEFAULT 0,
    boundary_pct NUMERIC(5,2) DEFAULT 0.0,
    wickets INT DEFAULT 0,
    bowling_avg NUMERIC(6,2) DEFAULT 0.0,
    bowling_econ NUMERIC(5,2) DEFAULT 0.0,
    bowling_sr NUMERIC(5,2) DEFAULT 0.0,
    catches INT DEFAULT 0,
    run_outs INT DEFAULT 0,
    stumpings INT DEFAULT 0,
    CONSTRAINT unique_player_format UNIQUE (cricsheet_name, format)
);
"""

# Verified Career Dataset (Test, ODI, T20I, IPL)
CAREER_DATA = [
    # Rohit Sharma (RG Sharma)
    ("Rohit Sharma", "RG Sharma", "Test", 59, 101, 4137, 44.01, 56.40, 12, 17, 52.1, 2, 112.0, 3.10, 216.0, 68, 8, 0),
    ("Rohit Sharma", "RG Sharma", "ODI", 265, 257, 10866, 49.16, 92.44, 31, 57, 61.4, 8, 64.3, 5.21, 74.1, 93, 14, 0),
    ("Rohit Sharma", "RG Sharma", "T20I", 159, 151, 4231, 32.05, 140.89, 5, 32, 69.2, 1, 113.0, 6.90, 98.0, 65, 12, 0),
    ("Rohit Sharma", "RG Sharma", "IPL", 257, 252, 6628, 29.72, 131.14, 2, 43, 64.8, 15, 30.2, 8.02, 22.6, 101, 19, 0),

    # Virat Kohli (V Kohli)
    ("Virat Kohli", "V Kohli", "Test", 113, 191, 8848, 49.15, 55.56, 29, 30, 48.2, 0, 0.0, 2.90, 0.0, 111, 11, 0),
    ("Virat Kohli", "V Kohli", "ODI", 295, 283, 13906, 58.18, 93.54, 50, 72, 54.6, 5, 136.0, 5.35, 152.0, 153, 24, 0),
    ("Virat Kohli", "V Kohli", "T20I", 125, 117, 4188, 48.69, 137.04, 1, 38, 58.2, 4, 51.0, 8.05, 38.0, 54, 16, 0),
    ("Virat Kohli", "V Kohli", "IPL", 252, 244, 8004, 38.66, 131.97, 8, 55, 60.1, 4, 92.0, 8.80, 63.0, 114, 21, 0),

    # Jasprit Bumrah (JJ Bumrah)
    ("Jasprit Bumrah", "JJ Bumrah", "Test", 36, 69, 212, 6.23, 44.53, 0, 0, 38.2, 159, 20.69, 2.74, 45.3, 14, 4, 0),
    ("Jasprit Bumrah", "JJ Bumrah", "ODI", 89, 41, 182, 7.58, 62.97, 0, 0, 42.1, 149, 23.55, 4.59, 30.8, 26, 7, 0),
    ("Jasprit Bumrah", "JJ Bumrah", "T20I", 70, 7, 8, 4.00, 61.53, 0, 0, 25.0, 89, 17.74, 6.27, 17.0, 19, 8, 0),
    ("Jasprit Bumrah", "JJ Bumrah", "IPL", 133, 26, 63, 9.00, 70.00, 0, 0, 35.0, 165, 22.51, 7.30, 18.5, 32, 9, 0),

    # Mitchell Starc (MA Starc)
    ("Mitchell Starc", "MA Starc", "Test", 89, 130, 2073, 21.82, 68.32, 0, 10, 58.0, 358, 27.74, 3.40, 48.9, 42, 6, 0),
    ("Mitchell Starc", "MA Starc", "ODI", 121, 72, 547, 12.72, 79.73, 0, 1, 49.2, 236, 22.96, 5.15, 26.7, 43, 9, 0),
    ("Mitchell Starc", "MA Starc", "T20I", 65, 17, 94, 9.40, 94.00, 0, 0, 40.0, 79, 23.81, 7.64, 18.7, 18, 5, 0),
    ("Mitchell Starc", "MA Starc", "IPL", 41, 14, 121, 13.44, 98.37, 0, 0, 44.0, 51, 24.84, 8.21, 18.1, 12, 4, 0),

    # Pat Cummins (PJ Cummins)
    ("Pat Cummins", "PJ Cummins", "Test", 62, 98, 1295, 16.60, 47.92, 0, 3, 50.1, 269, 22.53, 2.76, 49.0, 38, 5, 0),
    ("Pat Cummins", "PJ Cummins", "ODI", 88, 55, 477, 13.62, 75.95, 0, 1, 46.2, 141, 28.66, 5.28, 32.5, 32, 7, 0),
    ("Pat Cummins", "PJ Cummins", "T20I", 52, 20, 152, 13.81, 132.17, 0, 0, 62.0, 66, 23.40, 7.43, 18.9, 16, 6, 0),
    ("Pat Cummins", "PJ Cummins", "IPL", 58, 41, 515, 18.39, 148.84, 0, 3, 68.4, 63, 30.22, 8.85, 20.5, 20, 4, 0),
    
    # Babar Azam (Babar Azam)
    ("Babar Azam", "Babar Azam", "Test", 52, 94, 3898, 45.85, 54.88, 9, 26, 49.5, 2, 76.0, 4.10, 111.0, 45, 6, 0),
    ("Babar Azam", "Babar Azam", "ODI", 117, 114, 5729, 56.72, 88.75, 19, 32, 51.2, 0, 0.0, 6.20, 0.0, 50, 11, 0),
    ("Babar Azam", "Babar Azam", "T20I", 123, 116, 4145, 41.03, 129.08, 3, 36, 59.5, 0, 0.0, 0.0, 0.0, 52, 14, 0),
    ("Babar Azam", "Babar Azam", "IPL", 0, 0, 0, 0.0, 0.0, 0, 0, 0.0, 0, 0.0, 0.0, 0.0, 0, 0, 0),
]

try:
    conn = psycopg2.connect(
        dbname="cricai",
        user="postgres",
        password="Hahahaa!1",
        host="localhost",
        port="5432"
    )
    cur = conn.cursor()
    cur.execute(SCHEMA_SQL)
    print(">>> Table 'player_career_summaries' initialized.")

    insert_sql = """
        INSERT INTO player_career_summaries (
            player_name, cricsheet_name, format, matches, innings_batted, runs_scored,
            batting_avg, strike_rate, hundreds, fifties, boundary_pct,
            wickets, bowling_avg, bowling_econ, bowling_sr, catches, run_outs, stumpings
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (cricsheet_name, format) DO UPDATE SET
            batting_avg = EXCLUDED.batting_avg,
            strike_rate = EXCLUDED.strike_rate,
            runs_scored = EXCLUDED.runs_scored,
            wickets = EXCLUDED.wickets,
            bowling_avg = EXCLUDED.bowling_avg,
            bowling_econ = EXCLUDED.bowling_econ,
            bowling_sr = EXCLUDED.bowling_sr,
            catches = EXCLUDED.catches,
            run_outs = EXCLUDED.run_outs;
    """
    for row in CAREER_DATA:
        cur.execute(insert_sql, row)

    conn.commit()
    print(f">>> Successfully inserted/updated {len(CAREER_DATA)} format records.")
    cur.close()
    conn.close()
except Exception as e:
    print("ERROR:", e)
