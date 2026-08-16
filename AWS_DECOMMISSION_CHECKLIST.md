# AWS Decommission Checklist for PDFBolt

> [!IMPORTANT]
> **Safety First**: This checklist provides step-by-step guidance for the AWS account administrator to safely review and decommission legacy AWS resources. The PDFBolt codebase now has **0 active AWS production dependencies**. Only the account administrator should perform final external resource deletion and credential revocation.

---

## Administrator Decommissioning Checklist

- [ ] **Identify old AWS access keys**: Inspect all AWS IAM access keys previously configured for PDFBolt.
- [ ] **Confirm they are no longer required**: Verify that the application is running cleanly on Render and Google Cloud without accessing any AWS APIs.
- [ ] **Rotate/revoke old access keys**: Deactivate and delete legacy AWS access keys in IAM Console.
- [ ] **Check IAM users**: Audit IAM users created for PDFBolt and remove attached policies and credentials.
- [ ] **Check IAM roles**: Review and delete any IAM roles associated with PDFBolt or legacy Lambda / ECS / Amplify execution.
- [ ] **Check S3**: Confirm that legacy buckets (`pdfbolt-documents`, `pdfmaster-upload-bucket`) are empty and delete them.
- [ ] **Check CloudFront**: Disable and delete legacy CloudFront distributions pointing to S3 or Amplify origins.
- [ ] **Check Amplify**: Delete legacy AWS Amplify app instances.
- [ ] **Check Route53**: Update or decommission legacy DNS zones as traffic transitions to the new nameservers.
- [ ] **Check other AWS services**: Review AWS Cost Explorer and CloudWatch to ensure no background resources (SNS, SQS, SES, Secrets Manager) remain running.
- [ ] **Confirm old production traffic is zero**: Monitor traffic metrics on AWS to verify 0 active requests.
- [ ] **Confirm DNS migration**: Verify that `https://pdfbolt.in` returns 301 redirects to `https://pdfbolt.com`, and `https://pdfbolt.com` resolves directly to production.
- [ ] **Decommission old AWS resources**: Perform final account cleanup and set a zero-spend billing alert on AWS Budgets.
