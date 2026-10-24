import io
import json
import zipfile
import urllib.request
import psycopg2

DB_CONFIG = {
    "dbname": "cricai",
    "user": "postgres",
    "password": "Hahahaa!1",  # Replace with your actual password
    "host": "localhost",
    "port": "5432"
}

ARCHIVE_URL = "https://cricsheet.org/downloads/t20s_male_json.zip"
BATCH_SIZE = 30  # Ingest 30 recent matches

def parse_and_insert(cur, match_id, data):
    info = data["info"]
    outcome = info.get("outcome", {})
    by_info = outcome.get("by", {})
    dates = info.get("dates", [])
    match_date = dates[0] if dates else None

    # Handle event name structure safely
    event_raw = info.get("event")
    event_name = event_raw.get("name") if isinstance(event_raw, dict) else event_raw

    # 1. Insert Match
    insert_match_sql = """
        INSERT INTO matches (
            match_id, match_type, event_name, match_date, season,
            venue, city, team1, team2, toss_winner, toss_decision,
            winner, margin_runs, margin_wickets, result_type, player_of_match
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (match_id) DO NOTHING;
    """
    cur.execute(insert_match_sql, (
        match_id,
        info.get("match_type"),
        event_name,
        match_date,
        str(info.get("season")),
        info.get("venue"),
        info.get("city"),
        info["teams"][0],
        info["teams"][1],
        info.get("toss", {}).get("winner"),
        info.get("toss", {}).get("decision"),
        outcome.get("winner"),
        by_info.get("runs"),
        by_info.get("wickets"),
        outcome.get("result", "normal"),
        info.get("player_of_match", [None])[0] if info.get("player_of_match") else None
    ))

    # 2. Insert Deliveries
    insert_deliv_sql = """
        INSERT INTO deliveries (
            match_id, innings_number, batting_team, bowling_team,
            over_number, ball_number, batter, non_striker, bowler,
            runs_batter, runs_extras, runs_total, is_wicket,
            dismissal_kind, player_dismissed, fielder
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """
    for innings_idx, innings in enumerate(data.get("innings", []), start=1):
        batting_team = innings.get("team")
        bowling_team = info["teams"][1] if batting_team == info["teams"][0] else info["teams"][0]

        for over_data in innings.get("overs", []):
            over_num = over_data.get("over")
            for ball_idx, deliv in enumerate(over_data.get("deliveries", []), start=1):
                wickets = deliv.get("wickets", [])
                is_wicket = len(wickets) > 0
                dismissal_kind = wickets[0].get("kind") if is_wicket else None
                player_dismissed = wickets[0].get("player_out") if is_wicket else None

                fielder = None
                if is_wicket and "fielders" in wickets[0] and wickets[0]["fielders"]:
                    fielder = wickets[0]["fielders"][0].get("name")

                runs = deliv.get("runs", {})
                cur.execute(insert_deliv_sql, (
                    match_id, innings_idx, batting_team, bowling_team,
                    over_num, ball_idx, deliv.get("batter"), deliv.get("non_striker"),
                    deliv.get("bowler"), runs.get("batter", 0), runs.get("extras", 0),
                    runs.get("total", 0), is_wicket, dismissal_kind, player_dismissed, fielder
                ))

def run_batch():
    print("Downloading T20 matches archive stream from Cricsheet...")
    req = urllib.request.Request(ARCHIVE_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        zip_bytes = io.BytesIO(resp.read())

    print("Archive loaded into memory. Opening database connection...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        with zipfile.ZipFile(zip_bytes) as z:
            json_files = [f for f in z.namelist() if f.endswith(".json") and not f.startswith("README")]
            selected_files = json_files[-BATCH_SIZE:]

            print(f"Ingesting {len(selected_files)} matches into PostgreSQL...")
            for idx, file_name in enumerate(selected_files, start=1):
                with z.open(file_name) as f:
                    match_data = json.load(f)
                    match_id = file_name.replace(".json", "")
                    parse_and_insert(cur, match_id, match_data)
                print(f"[{idx}/{len(selected_files)}] Ingested {match_id}: {match_data['info']['teams'][0]} vs {match_data['info']['teams'][1]}")

            conn.commit()
            print("\nBatch ingestion finished successfully!")
    except Exception as e:
        conn.rollback()
        print(f"\nFailed during batch ingestion: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_batch()