import feedparser
import os
import json
from datetime import datetime, timedelta

def fetch_rss_feeds(feed_data, days=7):
    feeds_data = {}
    days_ago = datetime.now() - timedelta(days=days)
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    
    # Convert feed_data from dict with "teams" to array format
    if isinstance(feed_data, dict) and "teams" in feed_data:
        feed_array = []
        for team_name, urls in feed_data["teams"].items():
            feed_array.append({team_name: urls})
        feed_data = feed_array

    # Process each team in the array
    for team_obj in feed_data:
        for team_name, feed_urls in team_obj.items():
            team_feeds = []
            for url in feed_urls:
                try:
                    feed = feedparser.parse(url)
                    if debug:
                        print(f"Parsing feed: {url}")  # Debug print
                    feed_entries = []
                    for entry in feed.entries:
                        published_date = None
                        if hasattr(entry, 'published_parsed'):
                            published_date = datetime(*entry.published_parsed[:6])
                        elif hasattr(entry, 'updated_parsed'):
                            published_date = datetime(*entry.updated_parsed[:6])
                        
                        if debug:
                            print(f"Entry: {entry.title}, Published Date: {published_date}")  # Debug print
                        
                        if published_date:
                            if debug:
                                print(f"Published Date: {published_date}")
                        if published_date and published_date >= days_ago:
                            if debug:
                                print(f"Published Date is within the last {days} days: {published_date}")
                            feed_entries.append({
                                'title': entry.title,
                                'link': entry.link,
                                'published': published_date.isoformat(),
                                'summary': entry.summary
                            })
                    team_feeds.append({'feed_url': url, 'entries': feed_entries})
                except Exception as e:
                    if debug:
                        print(f"Failed to parse feed: {url}, Error: {e}")
            
            feeds_data[team_name] = team_feeds
    
    if debug:
        print("Fetched Feeds Data:", feeds_data)  # Debug print
    
    with open('feeds_data.json', 'w') as f:
        json.dump(feeds_data, f, default=str)
    
    return feeds_data