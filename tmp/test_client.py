import os
from supabase import create_client, ClientOptions

def test():
    # simulate access token
    access_token = "dummy_token"
    options = ClientOptions(headers={"Authorization": f"Bearer {access_token}"})
    try:
        client = create_client(
            "https://abulqajcpnbhvusputge.supabase.co", 
            "sb_publishable_BgYil34fAqnR35AXaQYDAw_uvikWyzJ", 
            options=options
        )
        print("Success!")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == '__main__':
    test()
