import json
from datetime import datetime, timedelta
from sst_tracker import process_and_merge

def run_test():
    print("--- Starting SST Logic Test ---")
    
    # 1. Initial State: 3 VODs on 2 different days
    initial_vods = [
        {"id": "vod_1", "created_at": "2026-03-01T10:00:00Z", "duration": "2h0m0s"},
        {"id": "vod_2", "created_at": "2026-03-01T14:00:00Z", "duration": "1h30m0s"}, # Same day crash
        {"id": "vod_3", "created_at": "2026-03-02T10:00:00Z", "duration": "3h0m0s"},
    ]
    
    print("\n[Step 1] Initial run with 3 VODs...")
    streams_after_step1, count1 = process_and_merge(initial_vods, [])
    print(f"Result: {len(streams_after_step1)} daily entries created. New VODs processed: {count1}")
    
    # Verify Step 1
    march1 = next(s for s in streams_after_step1 if s['date'] == '2026-03-01')
    print(f"March 1st Duration: {march1['durationMinutes']}m (Expected: 210m)")
    assert march1['durationMinutes'] == 210
    assert set(march1['vod_ids']) == {"vod_1", "vod_2"}

    # 2. Simulate Deleted VODs and New Stream
    # Twitch now only returns vod_3 (vod_1 and vod_2 were deleted)
    # AND a new 12h stream on March 3rd
    twitch_response_step2 = [
        {"id": "vod_3", "created_at": "2026-03-02T10:00:00Z", "duration": "3h0m0s"},
        {"id": "vod_4", "created_at": "2026-03-03T10:00:00Z", "duration": "12h0m0s"}, # New 12h stream
    ]
    
    print("\n[Step 2] Twitch deleted old VODs (1 & 2) and added a new 12h stream...")
    streams_after_step2, count2 = process_and_merge(twitch_response_step2, streams_after_step1)
    print(f"Result: {len(streams_after_step2)} total daily entries. New VODs processed: {count2}")
    
    # Verify Step 2
    # March 1st should STILL EXIST even though Twitch didn't return it
    march1_still_here = next((s for s in streams_after_step2 if s['date'] == '2026-03-01'), None)
    if march1_still_here:
        print("SUCCESS: March 1st data preserved despite VOD deletion from Twitch.")
        print(f"March 1st Duration remains: {march1_still_here['durationMinutes']}m")
    else:
        print("FAILURE: March 1st data was lost!")
        
    # March 3rd should be added
    march3 = next((s for s in streams_after_step2 if s['date'] == '2026-03-03'), None)
    if march3:
        print(f"SUCCESS: March 3rd (12h stream) added. Duration: {march3['durationMinutes']}m")
        assert march3['durationMinutes'] == 720
    else:
        print("FAILURE: March 3rd was not added!")

    print("\n--- Test Completed Successfully ---")

if __name__ == "__main__":
    run_test()
