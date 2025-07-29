import json
import os
import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import random
from typing import Dict, List, Tuple, Optional

from rss_fetcher import fetch_rss_feeds
from gemini_integration import send_to_gemini


# -----------------------------
# Helper: robust Gemini request
# -----------------------------


def _call_gemini_with_retry(prompt: str, payload: Dict[str, List[dict]], *, max_retries: int = 5) -> str:
    """Call `send_to_gemini` with simple exponential-backoff retry.

    Retries on common transient errors such as 503 overload or timeouts.
    """

    delay = 1.0  # seconds – initial backoff

    for attempt in range(1, max_retries + 1):
        try:
            return send_to_gemini(prompt, payload)
        except Exception as exc:
            msg = str(exc).lower()

            transient = (
                "timeout" in msg
                or "overloaded" in msg
                or "503" in msg
                or "temporarily" in msg
            )

            if attempt == max_retries or not transient:
                raise  # propagate

            # Sleep with jitter then retry
            sleep_for = delay * (0.8 + 0.4 * random.random())
            print(
                f"Transient error calling Gemini (attempt {attempt}/{max_retries}): {exc}. "
                f"Retrying in {sleep_for:.1f}s…"
            )
            time.sleep(sleep_for)
            delay *= 2  # exponential backoff

    # Should never reach here
    raise RuntimeError("Exceeded retry attempts without success")


def main(days: int = 7, team_filter: Optional[str] = None):
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    use_mock_feed_data = os.getenv('USE_MOCK_FEED_DATA', 'false').lower() == 'true'
    feeds_file = 'feeds_data.json'
    
    if use_mock_feed_data and os.path.exists(feeds_file):
        with open(feeds_file, 'r') as f:
            try:
                feeds_data = json.load(f)
                if not feeds_data:
                    raise ValueError("Empty data")
            except (json.JSONDecodeError, ValueError):
                with open('feeds.json', 'r') as f:
                    feed_data = json.load(f)
                
                feeds_data = fetch_rss_feeds(feed_data, days)
                
                with open(feeds_file, 'w') as f:
                    json.dump(feeds_data, f)
    else:
        with open('feeds.json', 'r') as f:
            feed_data = json.load(f)
        
        feeds_data = fetch_rss_feeds(feed_data, days)
        
        if use_mock_feed_data:
            with open(feeds_file, 'w') as f:
                json.dump(feeds_data, f)
    
    if debug:
        print("Fetched Feeds Data:", feeds_data)  # Debug print
    
    with open('prompt.txt', 'r') as f:
        prompt = f.read().strip()
    
    # ------------------------------------------------------------------
    # Batch feeds (3 feed URLs per request per team) and send in parallel
    # ------------------------------------------------------------------

    BATCH_SIZE = 3  # number of feed URLs per Gemini request

    tasks: List[Tuple[str, List[dict]]] = []  # (team_name, feeds_chunk)

    for team_name, team_feeds in feeds_data.items():
        if team_filter and team_name != team_filter:
            continue  # skip other teams when a filter is active
        # Split the feed list into chunks of size BATCH_SIZE
        for i in range(0, len(team_feeds), BATCH_SIZE):
            chunk = team_feeds[i : i + BATCH_SIZE]
            tasks.append((team_name, chunk))

    responses: Dict[str, List[str]] = defaultdict(list)

    # Use a thread pool to parallelise outbound requests. Adjust workers to taste.
    max_workers = min(8, max(1, len(tasks)))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_team = {
            executor.submit(_call_gemini_with_retry, prompt, {team: chunk}): team
            for team, chunk in tasks
        }

        for future in as_completed(future_to_team):
            team_name = future_to_team[future]
            try:
                result_text = future.result()
                responses[team_name].append(result_text)
            except Exception as e:
                print(f"Error calling Gemini LLM for {team_name}: {e}")
    
    print("\n=== Feed Updates by Team ===\n")
    for team_name, team_responses in responses.items():
        print(f"Team: {team_name}")
        print("=" * (len(team_name) + 6))
        combined_text = "\n\n".join(team_responses)  # merge batches for this team
        print(f"{combined_text}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Summarize RSS feeds with Gemini")
    parser.add_argument("--team", help="Process only this team (defaults to all teams)")
    parser.add_argument("--days", type=int, default=60, help="Look back this many days when fetching feeds")

    args = parser.parse_args()

    main(days=args.days, team_filter=args.team)