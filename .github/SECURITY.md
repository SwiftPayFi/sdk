# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, **do not open a public issue**. Instead:

1. **Email**: security@swiftpay.finance
2. **Include**: 
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We'll acknowledge receipt within 24 hours and provide a status update within 7 days.

## Security Measures

### GitHub Secrets
- **Encrypted at rest** in GitHub's database
- **Masked in logs** — never shown in workflow output
- **Scoped by environment** — can restrict access by branch
- **Auditable** — access logged by GitHub

### OIDC Authentication
- **No long-lived tokens** stored in GitHub
- **Temporary credentials** issued per job
- **Automatic expiration** after job completes
- **Fine-grained permissions** via IAM roles

### Dependency Management
- **Pinned exact versions** in workflows
- **Official actions only** (Google, PyPA, AWS, etc.)
- **Regular updates** checked via Dependabot
- **Source code reviewed** before adding new actions

### Secret Scanning
- **GitHub's secret scanning** enabled
- **Pre-commit hooks** block common patterns
- **`.gitignore`** prevents accidental commits

## Setup Instructions

### 1. Configure GitHub Secrets

#### For `checkout-release.yml` and `nodejs-release.yml`:

**Organization → Settings → Secrets and variables → Actions → New repository secret**

- **`NPM_TOKEN`** — npm authentication token
  ```
  Get from: npm.com → Settings → Tokens → Create Token (Automation)
  Scope: Read and Publish
  ```

- **`AWS_ROLE_TO_ASSUME`** — ARN of OIDC-enabled IAM role
  ```
  Format: arn:aws:iam::ACCOUNT_ID:role/github-checkout-release
  Create in AWS IAM with OIDC trust policy
  ```

- **`AWS_S3_BUCKET`** — S3 bucket for IIFE hosting
  ```
  Example: cdn.swiftpay.finance
  ```

#### For `python-release.yml`:

No secrets needed! PyPI uses GitHub OIDC trusted publishers.

**PyPI Setup:**
1. Go to pypi.org → Account Settings → Publishing
2. Add trusted publisher
3. Choose GitHub → Enter repository details

### 2. Set Up AWS OIDC

**AWS IAM → Idp → Add provider**

```json
{
  "Provider": "token.actions.githubusercontent.com",
  "Audience": "sts.amazonaws.com"
}
```

**Create IAM Role with trust policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:theigwe/swiftpay-finance:ref:refs/heads/*"
        }
      }
    }
  ]
}
```

**Attach S3 policy to role:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl"],
      "Resource": "arn:aws:s3:::your-bucket/checkout/*"
    }
  ]
}
```

### 3. Enable GitHub Secret Scanning

**Repository → Settings → Security and analysis → Secret scanning → Enable**

GitHub will:
- 🔍 Scan all commits for secrets
- 🚨 Alert on detected patterns
- 🔐 Block commits with high-confidence secrets

## Best Practices

### DO ✅
- Use GitHub Secrets for all sensitive values
- Use OIDC for cloud provider authentication
- Pin exact versions of GitHub Actions
- Review action source code before use
- Keep dependencies updated
- Rotate credentials regularly
- Monitor secret access logs
- Enable branch protection for main/dev

### DON'T ❌
- Hardcode secrets in workflows
- Commit `.env` files
- Use personal access tokens (use OIDC instead)
- Store credentials in code comments
- Use old/unmaintained GitHub Actions
- Disable secret scanning
- Share credentials via Slack/Email
- Use `*` permissions when specific ones exist

## Secrets Checklist

For each SDK release workflow:

- [ ] `NPM_TOKEN` configured and rotated annually
- [ ] `AWS_ROLE_TO_ASSUME` ARN correct and minimal permissions
- [ ] `AWS_S3_BUCKET` name correct and private policy set
- [ ] OIDC trust policy matches GitHub repo
- [ ] Branch protection rules enabled
- [ ] Secret scanning enabled
- [ ] Dependabot alerts checked weekly
- [ ] Workflow logs reviewed for exposure

## Incident Response

If a secret is accidentally exposed:

1. **Immediately revoke** the token/credential
2. **Rotate new credentials** (new npm token, new AWS role, etc.)
3. **Update GitHub Secrets** with new values
4. **Check logs** for unauthorized access
5. **Notify stakeholders** as appropriate
6. **Document** the incident and prevention steps

## Questions?

Contact: security@swiftpay.finance
