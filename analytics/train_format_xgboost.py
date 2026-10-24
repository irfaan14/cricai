import psycopg2
import pandas as pd
import numpy as np
import joblib
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import log_loss, accuracy_score, brier_score_loss

def get_connection():
    return psycopg2.connect(
        dbname="cricai",
        user="postgres",
        password="Hahahaa!1",
        host="localhost",
        port="5432"
    )

def extract_chase_data(match_type: str, is_women: bool):
    conn = get_connection()
    total_balls = 300 if match_type.upper() == 'ODI' else 120

    gender_filter = """
        (m.event_name ILIKE '%%Women%%' OR m.team1 ILIKE '%%Women%%' OR m.team2 ILIKE '%%Women%%')
    """ if is_women else """
        NOT (COALESCE(m.event_name, '') ILIKE '%%Women%%' OR m.team1 ILIKE '%%Women%%' OR m.team2 ILIKE '%%Women%%')
    """

    print(f"\n=======================================================")
    print(f"Extracting features: MatchType='{match_type}', Gender={'WOMEN' if is_women else 'MEN'}")
    print(f"=======================================================")

    query = f"""
        WITH inn1_targets AS (
            SELECT match_id, COALESCE(SUM(runs_total), 0) + 1 AS target_runs
            FROM deliveries
            WHERE innings_number = 1
            GROUP BY match_id
            HAVING SUM(runs_total) > 40
        )
        SELECT 
            d.match_id,
            t.target_runs,
            d.over_number,
            d.ball_number,
            d.runs_total,
            d.is_wicket,
            d.batting_team,
            m.winner
        FROM deliveries d
        JOIN matches m ON CAST(d.match_id AS VARCHAR) = CAST(m.match_id AS VARCHAR)
        JOIN inn1_targets t ON CAST(d.match_id AS VARCHAR) = CAST(t.match_id AS VARCHAR)
        WHERE d.innings_number = 2
          AND m.match_type = %s
          AND m.winner IS NOT NULL
          AND {gender_filter}
        ORDER BY d.match_id, d.over_number, d.ball_number;
    """

    df_raw = pd.read_sql(query, conn, params=(match_type,))
    conn.close()

    if df_raw.empty:
        print(f"?? No matches found for {match_type} ({'Women' if is_women else 'Men'}).")
        return pd.DataFrame()

    print(f"Loaded {len(df_raw)} ball-by-ball delivery rows across {df_raw['match_id'].nunique()} matches.")

    samples = []
    for match_id, match_df in df_raw.groupby('match_id'):
        target = match_df['target_runs'].iloc[0]
        winner = str(match_df['winner'].iloc[0]).strip().lower()
        batting_team = str(match_df['batting_team'].iloc[0]).strip().lower()
        chase_won = 1 if winner == batting_team else 0

        cum_runs = 0
        cum_wkts = 0
        balls_bowled = 0

        for _, row in match_df.iterrows():
            cum_runs += int(row['runs_total'])
            if row['is_wicket']:
                cum_wkts += 1
            balls_bowled += 1

            balls_remaining = max(1, total_balls - balls_bowled)
            runs_needed = max(0, target - cum_runs)
            wickets_in_hand = max(0, 10 - cum_wkts)
            crr = (cum_runs / max(1, balls_bowled)) * 6.0
            rrr = (runs_needed / balls_remaining) * 6.0

            # Sample every 3rd ball for balanced training and reduced auto-correlation
            if balls_bowled % 3 == 0 and balls_remaining > 2 and wickets_in_hand > 0:
                samples.append({
                    'runs_needed': runs_needed,
                    'balls_remaining': balls_remaining,
                    'wickets_in_hand': wickets_in_hand,
                    'crr': crr,
                    'rrr': rrr,
                    'chase_won': chase_won
                })

    df_samples = pd.DataFrame(samples)
    print(f"Generated {len(df_samples)} feature vectors.")
    return df_samples

def train_and_export_model(df, output_filename, model_title):
    if df.empty or len(df) < 200:
        print(f"? Not enough training data for {model_title} ({len(df)} rows). Skipping.")
        return

    X = df[['runs_needed', 'balls_remaining', 'wickets_in_hand', 'crr', 'rrr']]
    y = df['chase_won']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.18, random_state=42, stratify=y)

    scale_pos = (len(y_train) - sum(y_train)) / max(1, sum(y_train))
    model = XGBClassifier(
        n_estimators=300,
        learning_rate=0.06,
        max_depth=5,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos,
        eval_metric='logloss',
        random_state=42
    )
    model.fit(X_train, y_train)

    preds_prob = model.predict_proba(X_test)[:, 1]
    preds_bin = (preds_prob >= 0.5).astype(int)

    acc = accuracy_score(y_test, preds_bin)
    loss = log_loss(y_test, preds_prob)
    brier = brier_score_loss(y_test, preds_prob)

    print(f"\n?? [{model_title} Evaluation]")
    print(f"   Accuracy:    {acc*100:.2f}%")
    print(f"   Log-Loss:    {loss:.4f}")
    print(f"   Brier Score: {brier:.4f}")

    joblib.dump(model, output_filename)
    print(f"? Saved model artifact to: {output_filename}")

if __name__ == "__main__":
    # 1. Men's ODI (50 overs)
    df_m_odi = extract_chase_data(match_type='ODI', is_women=False)
    train_and_export_model(df_m_odi, "cricai_win_prob_mens_odi.joblib", "Men's ODI")

    # 2. Women's T20 (20 overs)
    df_w_t20 = extract_chase_data(match_type='T20', is_women=True)
    train_and_export_model(df_w_t20, "cricai_win_prob_womens_t20.joblib", "Women's T20")

    print("\n?? True Model Training Pipeline Completed.")
