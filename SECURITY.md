# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of KubeAtlas seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please DO NOT

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Please DO

1. **Email us directly** at [security@kubeatlas.io](mailto:security@kubeatlas.io)
2. Include the following information:
   - Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
   - Full paths of source file(s) related to the vulnerability
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the vulnerability

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.
- **Communication**: We will keep you informed of the progress towards fixing the vulnerability.
- **Timeline**: We aim to address critical vulnerabilities within 7 days.
- **Credit**: We will credit you in our release notes (unless you prefer to remain anonymous).

## Security Best Practices for Deployment

### Authentication & Authorization

- Always change the default admin password immediately after installation
- Use strong, unique passwords for all accounts
- Enable TLS for all communications
- Use RBAC with principle of least privilege

### Database

- Use strong passwords for PostgreSQL
- Restrict database access to only necessary services
- Enable SSL for database connections in production
- Regularly backup your database

### Kubernetes/OpenShift

- Use dedicated ServiceAccounts with minimal permissions
- Never store credentials in ConfigMaps
- Use Secrets with encryption at rest
- Regularly rotate ServiceAccount tokens

### Network

- Deploy behind a reverse proxy with TLS termination
- Use network policies to restrict pod-to-pod communication
- Keep the API server on a private network when possible
- Use firewall rules to restrict access

### Secrets Management

- Store sensitive data in Kubernetes Secrets
- Consider using external secret management (Vault, AWS Secrets Manager)
- Never commit secrets to version control
- Rotate secrets regularly

## Security Features

KubeAtlas includes the following security features:

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Admin, Editor, and Viewer roles
- **Audit Logging**: All actions are logged with user and timestamp
- **Input Validation**: All inputs are validated and sanitized
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Prevention**: Output encoding in frontend
- **CORS Configuration**: Configurable allowed origins
- **Rate Limiting**: Protection against brute force attacks (configurable)

## Vulnerability Disclosure Policy

We follow a coordinated vulnerability disclosure process:

1. Reporter submits vulnerability
2. We acknowledge and investigate
3. We develop and test a fix
4. We release the fix
5. We publicly disclose the vulnerability (with credit to reporter)

We ask that you give us a reasonable amount of time to address the vulnerability before any public disclosure.

Thank you for helping keep KubeAtlas and our users safe!
