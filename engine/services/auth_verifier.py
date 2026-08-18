from jose import jwt, JWTError
import config

class AuthVerifier:
    """
    Validates Google/Discord OAuth JWT tokens generated via Supabase Auth.
    """
    def __init__(self):
        self.secret = config.SUPABASE_JWT_SECRET

    def verify_token(self, token: str) -> dict:
        """
        Verifies the JWT token structure and signature.
        If SUPABASE_JWT_SECRET is not set, runs in DEV MOCKUP mode.
        """
        if not self.secret:
            print("⚠️ SUPABASE_JWT_SECRET is not configured in .env. Running in DEV MOCKUP mode.")
            if token == "dev-token":
                return {
                    "sub": "dev-user-id-12345",
                    "email": "dev@clippingapp.com",
                    "user_metadata": {"full_name": "Dev User"}
                }
            try:
                # Attempt to decode without verifying the signature for easy local testing
                claims = jwt.get_unverified_claims(token)
                return claims
            except Exception as e:
                print(f"❌ Failed to parse unverified token: {e}")
                return None

        try:
            # Decode and verify using the HS256 key provided by Supabase
            claims = jwt.decode(token, self.secret, algorithms=["HS256"], audience="authenticated")
            return claims
        except JWTError as e:
            print(f"❌ Supabase JWT verification failed: {e}")
            return None
