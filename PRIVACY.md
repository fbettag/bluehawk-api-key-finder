# Privacy Policy for BlueHawk API Key Finder

**Last updated: December 2024**

## Overview

BlueHawk API Key Finder is a browser extension designed for security researchers, bug bounty hunters, and red teamers. This privacy policy explains how the extension handles data.

## Data Collection

### What We DO NOT Collect

- We do **not** collect any personal information
- We do **not** send any data to external servers owned by us
- We do **not** track your browsing history
- We do **not** use analytics or telemetry
- We do **not** store any data outside your browser

### What the Extension Stores Locally

The extension stores the following data **locally in your browser** using Chrome's storage API:

- **Settings**: Your configuration preferences (auto-scan enabled, scan delay, notification settings)
- **History**: Scan results and detected tokens (stored locally for your reference)
- **Viewed tokens**: Which findings you've marked as reviewed

This data never leaves your browser unless you explicitly export it.

## Data Processing

### JavaScript Analysis

The extension analyzes JavaScript code on web pages you visit to detect hardcoded secrets. This analysis happens **entirely within your browser** - no code or findings are sent to external servers.

### Token Validation (Optional)

When you use the token validation feature, the extension may make requests to third-party APIs (GitHub, Slack, Stripe, etc.) to verify if detected tokens are active. These requests:

- Are only made when you explicitly trigger validation
- Go directly from your browser to the respective API
- Do not pass through any intermediary servers

### Discord Webhooks (Optional)

If you configure Discord webhook notifications:

- Alerts are sent directly from your browser to Discord
- You control the webhook URL
- No data passes through our servers

### Proxy Feature (Optional)

If you configure a proxy (e.g., Burp Suite, ZAP):

- Validation requests are routed through your specified proxy
- This is intended for security testing workflows
- You have full control over proxy configuration

## Permissions Explained

| Permission | Why It's Needed |
|------------|-----------------|
| `activeTab` | Access the current tab to scan JavaScript |
| `scripting` | Inject content scripts to analyze page code |
| `storage` | Save your settings and scan history locally |
| `notifications` | Alert you when secrets are found |
| `webRequest` | Intercept network requests to detect leaked credentials |
| `proxy` | Route validation requests through security testing proxies |
| `<all_urls>` | Scan JavaScript on any website you choose to analyze |

## Third-Party Services

The extension does not integrate with any third-party analytics, advertising, or tracking services.

When validating tokens, requests go directly to the respective service APIs (GitHub, Slack, etc.) - we have no visibility into these requests.

## Data Security

- All data is stored locally using Chrome's secure storage API
- No external transmission of your data occurs
- You can clear all stored data at any time through Chrome's extension settings

## Your Rights

You have full control over your data:

- **Export**: Download your scan history as JSON
- **Delete**: Clear all data via Chrome settings (Settings > Extensions > BlueHawk > Clear data)
- **Disable**: Turn off features like auto-scan or notifications at any time

## Changes to This Policy

We may update this privacy policy occasionally. Changes will be reflected in the "Last updated" date.

## Contact

For questions about this privacy policy or the extension:

- GitHub Issues: [https://github.com/fbettag/bluehawk-api-key-finder/issues](https://github.com/fbettag/bluehawk-api-key-finder/issues)
- Author: [fbettag](https://github.com/fbettag)

## Open Source

BlueHawk API Key Finder is open source under the MIT License. You can review the complete source code at:

[https://github.com/fbettag/bluehawk-api-key-finder](https://github.com/fbettag/bluehawk-api-key-finder)
