---
name: Check AWS S3 Status
description: Verifies that the configured AWS S3 bucket is accessible using credentials from .env.local.
---

# Check AWS S3 Status

This skill checks if the application can connect to the AWS S3 bucket configured in your environment variables.

## Usage

Run the following command in the terminal to execute the check:

```bash
node .agent/skills/s3_status_check/check_s3.js
```

## Prerequisites

1.  **Dependencies**: The project must have `@aws-sdk/client-s3` installed.
2.  **Configuration**: You must have a `.env` or `.env.local` file with the following variables:
    *   `VITE_AWS_ACCESS_KEY_ID`
    *   `VITE_AWS_SECRET_ACCESS_KEY`
    *   `VITE_AWS_REGION`
    *   `VITE_AWS_BUCKET_NAME`

## Troubleshooting

*   **Credentials Error**: If the script says "Invalid or missing AWS Credentials", double-check your `.env.local` file. Ensure you haven't left any placeholders like `[Your ID]`.
*   **Permissions Error**: If you get an Access Denied error, ensure your IAM user has `s3:ListBucket` and `s3:PutObject` permissions.
