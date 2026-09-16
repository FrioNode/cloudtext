# Cloudtext API

Cloudtext lets you send and receive SMS through an Android phone paired with your account.

## Full documentation

The complete interactive API reference, schemas, authentication details, and runnable request examples are available at:

<https://cloudtextapi.frionode.online/>

The public OpenAPI document is available from the same service for tooling and code generation.

## Base URL

```text
https://cloudtextapi.frionode.online/api/v1
```

Authenticate public API requests with the `x-api-key` header. API keys are created in the Cloudtext dashboard.

## Representative routes

- `POST /gateway/send-sms` sends one message to one or more recipients.
- `POST /gateway/send-bulk-sms` sends messages to multiple recipients in one request.
- `GET /gateway/devices` lists the Android devices paired with the account.
- `GET /gateway/messages` reads sent and received message history.
- `GET /gateway/stats` returns gateway usage statistics.
- `GET /webhooks` lists webhook subscriptions.
- `POST /webhooks` creates a subscription for SMS events.
- `GET /webhooks/notifications` reads webhook delivery history.

These are only the public routes intended for external integrations. The live documentation is the source of truth for request bodies, response schemas, pagination, webhook signatures, and the complete route list.

## Repository

Source code and issue tracking: <https://github.com/frionode/cloudtext>
