
import { CloudFrontClient, ListDistributionsCommand } from "@aws-sdk/client-cloudfront";
import dotenv from 'dotenv';
import path from 'path';

// Load env vars manually
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const client = new CloudFrontClient({
    region: process.env.VITE_AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY || ""
    }
});

async function listDistributions() {
    try {
        const command = new ListDistributionsCommand({});
        const response = await client.send(command);

        if (!response.DistributionList || !response.DistributionList.Items || response.DistributionList.Items.length === 0) {
            console.log("No CloudFront distributions found.");
            return;
        }

        console.log("Found CloudFront Distributions:");
        response.DistributionList.Items.forEach(dist => {
            console.log(`- ID: ${dist.Id}`);
            console.log(`  Domain: ${dist.DomainName}`);
            console.log(`  Status: ${dist.Status}`);
            console.log(`  Enabled: ${dist.Enabled}`);
            console.log(`  Comment: ${dist.Comment}`);
            console.log("---------------------------------------------------");
        });

    } catch (error) {
        console.error("Error listing distributions:", error);
    }
}

listDistributions();
