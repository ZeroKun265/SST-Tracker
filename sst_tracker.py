import requests
import json
import os
from datetime import datetime, timedelta

# Load configuration from config.json
CONFIG_FILE = 'config.json'

def load_config():
    if not os.path.exists(CONFIG_FILE):
        print(f"Error: {CONFIG_FILE} not found. Please copy config.json.example to config.json and fill in your keys.")
        return None
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)

config = load_config()

if config:
    TWITCH_CLIENT_ID = config.get('TWITCH_CLIENT_ID')
    TWITCH_CLIENT_SECRET = config.get('TWITCH_CLIENT_SECRET')
    DISCORD_TOKEN = config.get('DISCORD_TOKEN')
    STREAMER_NAME = config.get('STREAMER_NAME', 'omenkitty12')
    ANNOUNCEMENT_CHANNEL_ID = config.get('ANNOUNCEMENT_CHANNEL_ID')
    STREAM_BOT_CHANNEL_ID = config.get('STREAM_BOT_CHANNEL_ID')
    DISCORD_ENABLED = config.get('DISCORD_ENABLED', False)
else:
    # Fallback/Exit if no config
    import sys
    sys.exit(1)

def get_twitch_token():
    url = "https://id.twitch.tv/oauth2/token"
    params = {
        "client_id": TWITCH_CLIENT_ID,
        "client_secret": TWITCH_CLIENT_SECRET,
        "grant_type": "client_credentials"
    }
    try:
        response = requests.post(url, params=params)
        response.raise_for_status()
        return response.json().get('access_token')
    except Exception as e:
        print(f"Error getting Twitch token: {e}")
        return None

def get_streamer_id(token):
    url = f"https://api.twitch.tv/helix/users?login={STREAMER_NAME}"
    headers = {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(url, headers=headers)
    data = response.json().get('data')
    if data:
        return data[0]['id']
    return None

def get_past_streams(token, user_id):
    url = f"https://api.twitch.tv/helix/videos?user_id={user_id}&type=archive"
    headers = {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(url, headers=headers)
    return response.json().get('data', [])

def get_discord_delay(stream_start_time):
    """
    Placeholder for Discord logic. 
    If DISCORD_ENABLED is False, returns 0.
    """
    if not DISCORD_ENABLED:
        return 0
    
    # Real logic would go here:
    # 1. Fetch messages from ANNOUNCEMENT_CHANNEL_ID around stream_start_time
    # 2. Find the "soon" message from the streamer
    # 3. Calculate difference in minutes
    
    # For now, returning a mock value if enabled but not implemented
    return 15 

def calculate_stats():
    token = get_twitch_token()
    if not token:
        return

    user_id = get_streamer_id(token)
    if not user_id:
        print(f"Error: Could not find streamer {STREAMER_NAME}")
        return

    videos = get_past_streams(token, user_id)
    
    streams_data = []
    total_delay = 0
    
    # Process the last 20 streams for the tower and heatmap
    for video in videos[:20]:
        start_time = datetime.strptime(video['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        duration_str = video['duration']
        
        # Parse duration (e.g., 4h20m15s)
        hours = 0
        minutes = 0
        temp_dur = duration_str
        if 'h' in temp_dur:
            hours = int(temp_dur.split('h')[0])
            temp_dur = temp_dur.split('h')[1]
        if 'm' in temp_dur:
            minutes = int(temp_dur.split('m')[0])
        
        duration_minutes = hours * 60 + minutes
        
        # Get delay from Discord (or 0 if disabled)
        delay = get_discord_delay(start_time)
        
        streams_data.append({
            "id": video['id'],
            "date": start_time.strftime("%Y-%m-%d"),
            "startTime": video['created_at'],
            "endTime": (start_time + timedelta(minutes=duration_minutes)).isoformat() + "Z",
            "durationMinutes": duration_minutes,
            "game": video.get('description', 'Just Chatting')[:20] or "Just Chatting",
            "announcedTime": (start_time - timedelta(minutes=delay)).isoformat() + "Z",
            "delayMinutes": delay
        })
        total_delay += delay

    avg_delay = total_delay / len(streams_data) if streams_data else 0
    
    output = {
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "streamer": STREAMER_NAME,
        "streams": streams_data,
        "stats": {
            "averageDelay": round(avg_delay, 1),
            "totalStreamTime": sum(s['durationMinutes'] for s in streams_data),
            "mostPlayedGame": "Just Chatting",
            "longestDelay": max(s['delayMinutes'] for s in streams_data) if streams_data else 0,
            "shortestDelay": min(s['delayMinutes'] for s in streams_data) if streams_data else 0
        }
    }
    
    # Ensure public directory exists
    if not os.path.exists('public'):
        os.makedirs('public')

    with open('public/stats.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Stats updated successfully in public/stats.json (Discord Enabled: {DISCORD_ENABLED})")

if __name__ == "__main__":
    calculate_stats()
