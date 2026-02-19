
import { S3Client, GetBucketPolicyCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const client = new S3Client({
    region: process.env.VITE_AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY || ""
    }
});

const BUCKET_NAME = process.env.VITE_AWS_BUCKET_NAME || "pdfmaster-upload-bucket";

async function checkBucketPolicy() {
    try {
        const command = new GetBucketPolicyCommand({ Bucket: BUCKET_NAME });
        const response = await client.send(command);

        if (response.Policy) {
            console.log("Bucket Policy Found:");
            const policy = JSON.parse(response.Policy);
            console.log(JSON.stringify(policy, null, 2));

            const policyStr = JSON.stringify(policy);
            if (policyStr.includes("cloudfront")) {
                console.log("SUCCESS: CloudFront detected in bucket policy!");
            } else {
                console.log("No explicit CloudFront mention in policy.");
            }
        } else {
            console.log("No bucket policy found.");
        }

    } catch (error: any) {
        if (error.name === 'NoSuchBucketPolicy') {
            console.log("No bucket policy exists.");
        } else {
            console.error("Error fetching policy:", error.message);
        }
    }
}

checkBucketPolicy();
