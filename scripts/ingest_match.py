import json
import psycopg2
from pathlib import Path

# Database configuration
DB_CONFIG = {
    "dbname": "cricai",
    "user": "postgres",
    "password": "Hahahaa!1",  # Put your actual PostgreSQL password here
    "host": "localhost",
    "port": "5432"
}


def ingest_match():
    file_path = Path("C:/CricAI/data/sample_match.json")
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    info = data["info"]
    outcome = info.get("outcome", {})
    by_info = outcome.get("by", {})

    # Match ID extraction (from registry or filename fallback)
    match_id = str(info.get("match_type_number", "SAMPLE_T20_1"))
    match_date = info.get("dates", [None])[0]

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        # 1. Insert Match Row
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
            info.get("event", {}).get("name") if isinstance(info.get("event"), dict) else info.get("event"),
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

        # 2. Insert Ball-by-Ball Deliveries
        insert_deliv_sql = """
            INSERT INTO deliveries (
                match_id, innings_number, batting_team, bowling_team,
                over_number, ball_number, batter, non_striker, bowler,
                runs_batter, runs_extras, runs_total, is_wicket,
                dismissal_kind, player_dismissed, fielder
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """

        total_deliveries = 0
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
                        match_id,
                        innings_idx,
                        batting_team,
                        bowling_team,
                        over_num,
                        ball_idx,
                        deliv.get("batter"),
                        deliv.get("non_striker"),
                        deliv.get("bowler"),
                        runs.get("batter", 0),
                        runs.get("extras", 0),
                        runs.get("total", 0),
                        is_wicket,
                        dismissal_kind,
                        player_dismissed,
                        fielder
                    ))
                    total_deliveries += 1

        conn.commit()
        print(f"Ingestion complete: Match {match_id} saved with {total_deliveries} deliveries.")

    except Exception as e:
        conn.rollback()
        print(f"Error during ingestion: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    ingest_match()