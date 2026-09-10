# NR Broker Pre-provisioning Secret Pattern

This pattern allows pods to be stopped and started as required with minimal setup. The service deployment needs to use a secret with the AppRole login values (role id and secret id) to access service credentials. The secret is pre-provisioned by an OpenShift cron job that is installed in the same namespace as the pods. The job is installed using a provided helm chart and rotates the secret automatically.

## Prerequisites

- Access to an OpenShift namespace
- Helm 3 installed
- A source secret containing the Broker JWT and Vault role ID

The default source and target secret is `knox-secret` with keys:

- `token`: Broker JWT
- `role_id`: Vault AppRole role ID
- `secret_id`: provisioned Vault AppRole secret ID

## AppRole Setup

The AppRole needs to be setup specifically for this pattern to work. The first two are required. The CIDR restriction is recommended.

### Secret ID TTL

The secret id ttl (time to live) needs to be longer than the CronJob period. If you plan on running the CronJob daily (the default) then you should request the ttl to be longer than 24 hours. To prevent outages, you may want to request that the TTL be even a couple days so that the CronJob failing doesn't immediately impact the ability for pods to start.

### Secret ID Usage

The secret id usages needs to be set to 0 (infinite) or some other reasonable number. The default number of usages is 1 which will prevent more than 1 pod starting per provisioning.

### Login CIDR Restriction

The per-environment AppRole login can be configured to only allow logins from an IP range (CIDR). This ensures that, even though the provisioned login credentials can be used multiple times, the logins are limited to an expected range. This range can be updated anytime without needing to re-provision a new secret id.

Ideally, the configured CIDR will be unique to the service and environment. You will want to ensure your hosting option can provide this. In any case, this restriction isn't foolproof and other methods like audit log monitoring should be used to identify and investigate unusual logins.

## Install

This repository uses GitHub Pages to distribute the helm chart. First, ensure you have the helm repo installed.

```bash
helm repo add broker https://bcgov.github.io/nr-broker-credential-injection
```

Next, create a values file with service and other environment specific settings. The configured user must have the change role for the environment for the service in NR Broker. If this user leaves your team or their access changes, you must update the value to a new user with the change role.

```yaml
intention:
  service:
    name: "nodejs-sample"
    project: "oscar-example"
    environment: "development"
  user:
    name: "mbystedt@azureidir"
```

If you are running in an environment that requires egress network policies, you can add values like this to configure it. Please reach out to discuss the CIDR.

```yaml
cron:
  podLabels:
    DataClass: Medium

networkPolicy:
  create: true
  egress:
    - cidr: x.x.x.x/32
      ports:
        - protocol: TCP
          port: 443
    - podSelector:
        matchLabels:
          app: vault
```

If you want to sync vault secrets to Openshift Secrets

```yaml
sync:
  # Enable or disable the sync job
  enabled: false

  # Schedule for the sync job (cron expression)
  # Set to empty string to run as a one-time Job (not CronJob)
  # schedule: ""

  # Vault secret paths to read (comma-separated)
  # Example: "secret/data/app-config,secret/data/db-credentials"
  vaultPaths: ""

  # OpenShift secret names to create/update (comma-separated, must match vaultPaths count)
  # Example: "app-config-secret,db-credentials-secret"
  secretNames: ""

  # Source secret containing AppRole credentials (for login) which described below
  sourceSecret:
    name: "knox-secret"
    vaultRoleIdKey: "role_id"
    vaultSecretIdKey: "secret_id"
```

Before installation, manually add a secret (default: knox-secret) with the keys 'token' (the service broker token) and 'role_id' (the environment's AppRole role id). The token and role id must never be shared or added to source control. Users in Broker with service sudo access (lead developer) can access this data.

Finally, install the cronjob.

```bash
helm install knox-provision broker/cronjob-deployment -f common.yaml -f dev.yaml
```


https://github.com/bcgov/nr-broker-credential-injection/blob/main/provision-secret/README.md
