"""
PDFBolt Partner API Key Generator CLI
Generates cryptographically secure, high-entropy partner API keys for B2B collaboration.
"""

import argparse
import secrets
import json
import hashlib


def generate_key(partner_id: str, tier: str = "standard", rate_limit: int = 120) -> dict:
    clean_id = partner_id.lower().strip().replace(" ", "_").replace("-", "_")
    random_entropy = secrets.token_urlsafe(32)
    api_key = f"pdfbolt_live_{clean_id}_{random_entropy}"
    key_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()

    return {
        "partner_id": clean_id,
        "api_key": api_key,
        "key_hash": key_hash,
        "tier": tier,
        "rate_limit_per_minute": rate_limit,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate PDFBolt Partner API Key for external collaboration.")
    parser.add_argument("--partner", "-p", required=True, help="Partner identifier (e.g. acme_corp, tax_service, govt_portal)")
    parser.add_argument("--tier", "-t", default="standard", choices=["standard", "pro", "enterprise"], help="Access tier")
    parser.add_argument("--limit", "-l", type=int, default=120, help="Rate limit in requests per minute (default: 120)")

    args = parser.parse_args()
    result = generate_key(args.partner, args.tier, args.limit)

    print("\n" + "=" * 70)
    print("🔑 PDFBolt Partner API Key Generated Successfully")
    print("=" * 70)
    print(f"Partner ID:     {result['partner_id']}")
    print(f"Tier:           {result['tier']}")
    print(f"Rate Limit:     {result['rate_limit_per_minute']} req/min")
    print(f"Live API Key:   {result['api_key']}")
    print(f"SHA-256 Hash:   {result['key_hash']}")
    print("=" * 70)
    print("\n👉 Add to backend/.env (JSON Dictionary format):")
    env_json = json.dumps({
        result['partner_id']: {
            "key": result['api_key'],
            "tier": result['tier'],
            "rate_limit": result['rate_limit_per_minute']
        }
    })
    print(f"PARTNER_API_KEYS='{env_json}'")
    print("\n👉 Or add to backend/.env (Simple Comma-separated format):")
    print(f"PARTNER_API_KEYS=\"{result['api_key']}\"")
    print("\n👉 To enforce mandatory keys for all external (non-browser) requests:")
    print("REQUIRE_API_KEY_FOR_EXTERNAL=true")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
