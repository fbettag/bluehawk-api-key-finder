/**
 * BlueHawk API Key Finder - SDK Patterns Module
 *
 * Comprehensive patterns for detecting SDK initialization
 * and configuration across popular services.
 */

/**
 * SDK initialization signatures
 * Maps SDK names to their initialization patterns
 */
export const SDK_SIGNATURES = {
  // Cloud Providers
  AWS: {
    patterns: [
      'AWS.Config',
      'AWS.S3',
      'AWS.DynamoDB',
      'AWS.Lambda',
      'AWS.SQS',
      'AWS.SNS',
      'AWS.SES',
      'AWS.Cognito',
      'AWS.CloudWatch',
      'AWS.IAM',
      'new AWS.',
      'AWS.config.update',
    ],
    configKeys: [
      'accessKeyId', 'secretAccessKey', 'sessionToken',
      'region', 'credentials', 'apiVersion'
    ],
    secretKeys: ['accessKeyId', 'secretAccessKey', 'sessionToken'],
    severity: 'critical'
  },

  GCP: {
    patterns: [
      'google.cloud',
      '@google-cloud/',
      'GoogleAuth',
      'new Storage(',
      'new BigQuery(',
      'new Firestore(',
    ],
    configKeys: ['projectId', 'keyFilename', 'credentials', 'apiKey'],
    secretKeys: ['credentials', 'apiKey', 'private_key'],
    severity: 'critical'
  },

  Azure: {
    patterns: [
      '@azure/',
      'AzureStorage',
      'ServiceBusClient',
      'BlobServiceClient',
      'CosmosClient',
    ],
    configKeys: ['connectionString', 'accountKey', 'sasToken', 'credential'],
    secretKeys: ['accountKey', 'sasToken', 'connectionString'],
    severity: 'critical'
  },

  // Payment Providers
  Stripe: {
    patterns: [
      'Stripe(',
      'new Stripe(',
      'stripe.api_key',
      'stripe.setApiKey',
    ],
    configKeys: ['apiKey', 'publishableKey', 'secretKey'],
    secretKeys: ['secretKey', 'apiKey'],
    prefixPatterns: [/^sk_live_/, /^sk_test_/, /^pk_live_/, /^pk_test_/, /^rk_live_/, /^rk_test_/],
    severity: 'critical'
  },

  PayPal: {
    patterns: [
      'paypal.Buttons',
      'paypal.FUNDING',
      'PayPalScriptProvider',
      'paypal-checkout',
    ],
    configKeys: ['client-id', 'clientId', 'secret'],
    secretKeys: ['secret', 'clientSecret'],
    severity: 'high'
  },

  Square: {
    patterns: [
      'Square.',
      'SquareClient',
      'square.paymentsApi',
    ],
    configKeys: ['accessToken', 'applicationId', 'locationId'],
    secretKeys: ['accessToken'],
    severity: 'high'
  },

  // Authentication Services
  Auth0: {
    patterns: [
      'Auth0Client',
      'createAuth0Client',
      'auth0-spa-js',
      '@auth0/',
    ],
    configKeys: ['domain', 'clientId', 'clientSecret', 'audience'],
    secretKeys: ['clientSecret'],
    severity: 'high'
  },

  Firebase: {
    patterns: [
      'firebase.initializeApp',
      'initializeApp(',
      'getAuth(',
      'getFirestore(',
      'getStorage(',
      '@firebase/',
    ],
    configKeys: [
      'apiKey', 'authDomain', 'projectId', 'storageBucket',
      'messagingSenderId', 'appId', 'measurementId'
    ],
    secretKeys: ['apiKey'],
    severity: 'high'
  },

  Supabase: {
    patterns: [
      'createClient(',
      '@supabase/supabase-js',
      'supabase.from(',
    ],
    configKeys: ['supabaseUrl', 'supabaseKey', 'supabaseAnonKey'],
    secretKeys: ['supabaseKey', 'supabaseAnonKey'],
    severity: 'high'
  },

  Okta: {
    patterns: [
      'OktaAuth',
      '@okta/okta-auth-js',
      'okta.signIn',
    ],
    configKeys: ['clientId', 'issuer', 'redirectUri', 'clientSecret'],
    secretKeys: ['clientSecret'],
    severity: 'high'
  },

  // Communication Services
  Twilio: {
    patterns: [
      'Twilio(',
      'new Twilio(',
      'twilio.messages',
    ],
    configKeys: ['accountSid', 'authToken', 'apiKey', 'apiSecret'],
    secretKeys: ['authToken', 'apiKey', 'apiSecret'],
    severity: 'critical'
  },

  SendGrid: {
    patterns: [
      'sgMail.setApiKey',
      '@sendgrid/mail',
      'SendGridMail',
    ],
    configKeys: ['apiKey'],
    secretKeys: ['apiKey'],
    prefixPatterns: [/^SG\./],
    severity: 'high'
  },

  Mailgun: {
    patterns: [
      'mailgun(',
      'Mailgun(',
      'mailgun-js',
    ],
    configKeys: ['apiKey', 'domain', 'username'],
    secretKeys: ['apiKey'],
    severity: 'high'
  },

  Slack: {
    patterns: [
      'WebClient(',
      '@slack/web-api',
      'slack.chat.postMessage',
    ],
    configKeys: ['token', 'signingSecret', 'botToken'],
    secretKeys: ['token', 'signingSecret', 'botToken'],
    prefixPatterns: [/^xox[baprs]-/, /^xapp-/],
    severity: 'high'
  },

  Discord: {
    patterns: [
      'Discord.Client',
      'discord.js',
      'new Client({',
    ],
    configKeys: ['token', 'clientId', 'clientSecret'],
    secretKeys: ['token', 'clientSecret'],
    severity: 'high'
  },

  // Search & Database
  Algolia: {
    patterns: [
      'algoliasearch(',
      'searchClient',
      '@algolia/',
    ],
    configKeys: ['appId', 'apiKey', 'searchOnlyApiKey', 'adminApiKey'],
    secretKeys: ['apiKey', 'adminApiKey'],
    severity: 'high'
  },

  Elasticsearch: {
    patterns: [
      'Client({',
      '@elastic/elasticsearch',
      'elasticsearch.Client',
    ],
    configKeys: ['node', 'auth', 'apiKey', 'username', 'password'],
    secretKeys: ['apiKey', 'password'],
    severity: 'high'
  },

  MongoDB: {
    patterns: [
      'MongoClient',
      'mongoose.connect',
      'mongodb+srv://',
    ],
    configKeys: ['uri', 'connectionString'],
    secretKeys: ['uri', 'connectionString'],
    severity: 'critical'
  },

  Redis: {
    patterns: [
      'createClient(',
      'Redis({',
      'ioredis',
    ],
    configKeys: ['url', 'password', 'host', 'port'],
    secretKeys: ['password', 'url'],
    severity: 'high'
  },

  // Analytics & Monitoring
  Mixpanel: {
    patterns: [
      'mixpanel.init',
      'Mixpanel.init',
    ],
    configKeys: ['token', 'api_secret'],
    secretKeys: ['api_secret'],
    severity: 'medium'
  },

  Amplitude: {
    patterns: [
      'amplitude.init',
      'Amplitude.getInstance',
    ],
    configKeys: ['apiKey'],
    secretKeys: ['apiKey'],
    severity: 'medium'
  },

  Segment: {
    patterns: [
      'analytics.load',
      'Analytics(',
      '@segment/',
    ],
    configKeys: ['writeKey'],
    secretKeys: ['writeKey'],
    severity: 'medium'
  },

  Datadog: {
    patterns: [
      'datadogRum.init',
      'DD_RUM',
      '@datadog/',
    ],
    configKeys: ['clientToken', 'applicationId', 'apiKey'],
    secretKeys: ['clientToken', 'apiKey'],
    severity: 'high'
  },

  Sentry: {
    patterns: [
      'Sentry.init',
      '@sentry/',
    ],
    configKeys: ['dsn', 'authToken'],
    secretKeys: ['authToken'],
    severity: 'medium'
  },

  // Social & OAuth
  GitHub: {
    patterns: [
      'Octokit',
      '@octokit/',
      'new Octokit',
    ],
    configKeys: ['auth', 'token'],
    secretKeys: ['auth', 'token'],
    prefixPatterns: [/^ghp_/, /^gho_/, /^ghu_/, /^ghs_/, /^ghr_/],
    severity: 'critical'
  },

  Twitter: {
    patterns: [
      'TwitterApi',
      'twitter-api-v2',
      'Twit(',
    ],
    configKeys: ['appKey', 'appSecret', 'accessToken', 'accessSecret', 'bearerToken'],
    secretKeys: ['appSecret', 'accessSecret', 'bearerToken'],
    severity: 'high'
  },

  Facebook: {
    patterns: [
      'FB.init',
      'facebook-nodejs-business-sdk',
    ],
    configKeys: ['appId', 'appSecret', 'accessToken'],
    secretKeys: ['appSecret', 'accessToken'],
    severity: 'high'
  },

  // AI/ML Services
  OpenAI: {
    patterns: [
      'OpenAI(',
      'new OpenAI(',
      'openai.createCompletion',
      'openai.chat.completions',
    ],
    configKeys: ['apiKey', 'organization'],
    secretKeys: ['apiKey'],
    prefixPatterns: [/^sk-[a-zA-Z0-9]{20,}$/],
    severity: 'critical'
  },

  Anthropic: {
    patterns: [
      'Anthropic(',
      'new Anthropic(',
      '@anthropic-ai/sdk',
    ],
    configKeys: ['apiKey'],
    secretKeys: ['apiKey'],
    prefixPatterns: [/^sk-ant-/],
    severity: 'critical'
  },

  Cohere: {
    patterns: [
      'Cohere(',
      'cohere.generate',
    ],
    configKeys: ['apiKey', 'token'],
    secretKeys: ['apiKey', 'token'],
    severity: 'high'
  },

  HuggingFace: {
    patterns: [
      'HfInference',
      '@huggingface/',
    ],
    configKeys: ['apiKey', 'token'],
    secretKeys: ['apiKey', 'token'],
    prefixPatterns: [/^hf_/],
    severity: 'high'
  },

  // Maps & Location
  GoogleMaps: {
    patterns: [
      'google.maps',
      '@googlemaps/',
      'new google.maps.',
    ],
    configKeys: ['key', 'apiKey'],
    secretKeys: ['key', 'apiKey'],
    prefixPatterns: [/^AIza[A-Za-z0-9_-]{35}$/],
    severity: 'high'
  },

  Mapbox: {
    patterns: [
      'mapboxgl.accessToken',
      'Mapbox(',
      'mapbox-gl',
    ],
    configKeys: ['accessToken'],
    secretKeys: ['accessToken'],
    prefixPatterns: [/^pk\./, /^sk\./],
    severity: 'high'
  },

  // Realtime & Websockets
  Pusher: {
    patterns: [
      'Pusher(',
      'new Pusher(',
      'pusher-js',
    ],
    configKeys: ['key', 'secret', 'appId', 'cluster'],
    secretKeys: ['secret'],
    severity: 'high'
  },

  Ably: {
    patterns: [
      'Ably.Realtime',
      'ably-js',
    ],
    configKeys: ['key', 'token'],
    secretKeys: ['key'],
    severity: 'high'
  },

  // Storage & CDN
  Cloudinary: {
    patterns: [
      'cloudinary.config',
      'cloudinary.v2',
    ],
    configKeys: ['cloud_name', 'api_key', 'api_secret'],
    secretKeys: ['api_secret'],
    severity: 'high'
  },

  Uploadcare: {
    patterns: [
      'uploadcare.Widget',
      '@uploadcare/',
    ],
    configKeys: ['publicKey', 'secretKey'],
    secretKeys: ['secretKey'],
    severity: 'high'
  },
};

/**
 * Get SDK info by pattern match
 */
export function detectSDK(code) {
  const detected = [];

  for (const [sdkName, config] of Object.entries(SDK_SIGNATURES)) {
    for (const pattern of config.patterns) {
      if (code.includes(pattern)) {
        detected.push({
          name: sdkName,
          pattern,
          config,
          severity: config.severity
        });
        break; // Only add once per SDK
      }
    }
  }

  return detected;
}

/**
 * Check if a value matches any SDK prefix pattern
 */
export function matchSDKPrefix(value) {
  for (const [sdkName, config] of Object.entries(SDK_SIGNATURES)) {
    if (config.prefixPatterns) {
      for (const pattern of config.prefixPatterns) {
        if (pattern.test(value)) {
          return {
            sdk: sdkName,
            severity: config.severity,
            pattern: pattern.toString()
          };
        }
      }
    }
  }
  return null;
}

/**
 * Check if a config key is a known secret key for any SDK
 */
export function isKnownSecretKey(key) {
  const lowerKey = key.toLowerCase();

  for (const [sdkName, config] of Object.entries(SDK_SIGNATURES)) {
    for (const secretKey of config.secretKeys) {
      if (secretKey.toLowerCase() === lowerKey) {
        return {
          sdk: sdkName,
          severity: config.severity,
          key: secretKey
        };
      }
    }
  }

  return null;
}

/**
 * Get all config keys that should be scanned for a given SDK
 */
export function getSDKConfigKeys(sdkName) {
  const sdk = SDK_SIGNATURES[sdkName];
  return sdk ? sdk.configKeys : [];
}

/**
 * Get all secret keys for a given SDK
 */
export function getSDKSecretKeys(sdkName) {
  const sdk = SDK_SIGNATURES[sdkName];
  return sdk ? sdk.secretKeys : [];
}

/**
 * Get SDK severity level
 */
export function getSDKSeverity(sdkName) {
  const sdk = SDK_SIGNATURES[sdkName];
  return sdk ? sdk.severity : 'medium';
}

/**
 * Get all supported SDK names
 */
export function getSupportedSDKs() {
  return Object.keys(SDK_SIGNATURES);
}

/**
 * Get SDK configuration by name
 */
export function getSDKConfig(sdkName) {
  return SDK_SIGNATURES[sdkName] || null;
}

export default {
  SDK_SIGNATURES,
  detectSDK,
  matchSDKPrefix,
  isKnownSecretKey,
  getSDKConfigKeys,
  getSDKSecretKeys,
  getSDKSeverity,
  getSupportedSDKs,
  getSDKConfig
};
