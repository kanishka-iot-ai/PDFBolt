
import { S3Client, HeadBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from 'fs';
import path from 'path';

// Helper to parse env files manually to avoid needing dotenv dependency
function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            let value = match[2].trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[match[1].trim()] = value;
        }
    });
    return env;
}

async function checkS3() {
    const rootDir = process.cwd();
    const envConfig = { ...parseEnv(path.join(rootDir, '.env')), ...parseEnv(path.join(rootDir, '.env.local')) };

    const region = envConfig.VITE_AWS_REGION;
    const accessKeyId = envConfig.VITE_AWS_ACCESS_KEY_ID;
    const secretAccessKey = envConfig.VITE_AWS_SECRET_ACCESS_KEY;
    const bucketName = envConfig.VITE_AWS_BUCKET_NAME;

    console.log("---------------------------------------------------");
    console.log("Configured AWS Region:", region);
    console.log("Configured Bucket:", bucketName);
    console.log("Access Key ID:", accessKeyId ? `${accessKeyId.substring(0, 4)}...` : "(Not Set)");
    console.log("---------------------------------------------------");

    if (!accessKeyId || !secretAccessKey || accessKeyId.includes("[Your")) {
        console.error("❌ Error: Invalid or missing AWS Credentials.");
        console.error("Please update .env.local with your actual VITE_AWS_ACCESS_KEY_ID and VITE_AWS_SECRET_ACCESS_KEY.");
        process.exit(1);
    }

    const client = new S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    try {
        console.log(`Checking bucket '${bucketName}' accessible...`);
        const command = new HeadBucketCommand({ Bucket: bucketName });
        await client.send(command);
        console.log("✅ Success! Bucket exists and is accessible.");

        console.log("Attempting to list objects to verify read permissions...");
        const listCmd = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
        await client.send(listCmd);
        console.log("✅ Success! Can list objects.");

    } catch (error) {
        console.error("❌ Error checking S3 status:", error.name, error.message);
        process.exit(1);
    }
}

checkS3();
