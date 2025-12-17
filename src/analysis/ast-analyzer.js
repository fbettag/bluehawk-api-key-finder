/**
 * BlueHawk API Key Finder - AST Analyzer Module
 *
 * Uses Babel Parser and Traverse for semantic JavaScript analysis.
 * Detects secrets in variable declarations, object properties,
 * function calls, and SDK initialization patterns.
 */

// Lazy-loaded Babel modules
let parser = null;
let traverse = null;

/**
 * Lazy load Babel parser
 */
async function loadParser() {
  if (!parser) {
    parser = await import('@babel/parser');
  }
  return parser;
}

/**
 * Lazy load Babel traverse
 */
async function loadTraverse() {
  if (!traverse) {
    const module = await import('@babel/traverse');
    traverse = module.default || module;
  }
  return traverse;
}

/**
 * Variable names that suggest secrets
 */
const SUSPICIOUS_VAR_NAMES = [
  /api[_-]?key/i,
  /secret[_-]?key/i,
  /access[_-]?key/i,
  /private[_-]?key/i,
  /auth[_-]?token/i,
  /bearer[_-]?token/i,
  /client[_-]?secret/i,
  /client[_-]?id/i,
  /password/i,
  /passwd/i,
  /credential/i,
  /signing[_-]?key/i,
  /encryption[_-]?key/i,
  /^(sk|pk|rk|ak|aws|stripe)_/i,
  /token$/i,
  /secret$/i,
  /key$/i,
  /apiKey/i,
  /secretKey/i,
  /accessToken/i,
  /authToken/i,
  /privateKey/i,
];

/**
 * Object property names that suggest secrets
 */
const SUSPICIOUS_PROP_NAMES = [
  'apiKey', 'api_key', 'apikey',
  'secretKey', 'secret_key', 'secretkey',
  'accessKey', 'access_key', 'accesskey',
  'privateKey', 'private_key', 'privatekey',
  'authToken', 'auth_token', 'authtoken',
  'accessToken', 'access_token', 'accesstoken',
  'bearerToken', 'bearer_token', 'bearertoken',
  'clientSecret', 'client_secret', 'clientsecret',
  'clientId', 'client_id', 'clientid',
  'password', 'passwd', 'pwd',
  'secret', 'token', 'key', 'credential',
  'awsAccessKeyId', 'awsSecretAccessKey',
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
  'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY',
  'FIREBASE_API_KEY', 'GOOGLE_API_KEY',
  'DATABASE_URL', 'MONGODB_URI', 'REDIS_URL',
  'JWT_SECRET', 'SESSION_SECRET',
  'SENDGRID_API_KEY', 'TWILIO_AUTH_TOKEN',
  'GITHUB_TOKEN', 'NPM_TOKEN', 'SLACK_TOKEN',
  'authorization', 'Authorization',
  'x-api-key', 'X-Api-Key',
];

/**
 * Check if a variable name is suspicious
 */
function isSuspiciousName(name) {
  if (!name) return false;
  return SUSPICIOUS_VAR_NAMES.some(pattern => pattern.test(name));
}

/**
 * Check if a property name is suspicious
 */
function isSuspiciousProperty(name) {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  return SUSPICIOUS_PROP_NAMES.some(prop =>
    prop.toLowerCase() === lowerName ||
    lowerName.includes(prop.toLowerCase())
  );
}

/**
 * Check if a value looks like a potential secret
 */
function isPotentialSecret(value) {
  if (typeof value !== 'string') return false;
  if (value.length < 8 || value.length > 500) return false;

  // Skip obvious non-secrets
  if (/^https?:\/\//i.test(value)) return false;
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) return false; // Email
  if (/^(true|false|null|undefined)$/i.test(value)) return false;
  if (/^\d+$/.test(value) && value.length < 15) return false; // Plain numbers
  if (/^[a-z_]+$/i.test(value) && value.length < 20) return false; // Simple words

  // Check for patterns that suggest secrets
  if (/^[A-Za-z0-9_-]{20,}$/.test(value)) return true;
  if (/^[A-Fa-f0-9]{32,}$/.test(value)) return true; // Hex
  if (/^eyJ[A-Za-z0-9_-]+\.eyJ/.test(value)) return true; // JWT
  if (/^(sk|pk|rk|ak|key|token)[-_]/i.test(value)) return true;
  if (/^AIza[A-Za-z0-9_-]{35}$/.test(value)) return true; // Google
  if (/^ghp_[A-Za-z0-9]{36}$/.test(value)) return true; // GitHub

  // Has mix of characters suggesting randomness
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[_-]/.test(value);
  const charTypes = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

  return charTypes >= 2 && value.length >= 15;
}

/**
 * Get string value from AST node
 */
function getStringValue(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.quasis.length === 1) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

/**
 * Get identifier name from AST node
 */
function getIdentifierName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'StringLiteral') return node.value;
  return null;
}

/**
 * Parse JavaScript code into AST
 */
export async function parseCode(code, options = {}) {
  const babelParser = await loadParser();

  const parseOptions = {
    sourceType: 'unambiguous',
    allowImportExportEverywhere: true,
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    errorRecovery: true, // Continue parsing despite errors
    plugins: [
      'jsx',
      'typescript',
      'decorators-legacy',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'dynamicImport',
      'nullishCoalescingOperator',
      'optionalChaining',
      'objectRestSpread',
    ],
    ...options
  };

  try {
    return babelParser.parse(code, parseOptions);
  } catch (error) {
    console.warn('[BlueHawk AST] Parse error:', error.message);
    return null;
  }
}

/**
 * Analyze AST for potential secrets
 */
export async function analyzeAST(ast, options = {}) {
  if (!ast) return [];

  const babelTraverse = await loadTraverse();
  const findings = [];
  const { filename = 'unknown', onProgress } = options;

  const visitors = {
    // Variable declarations: const apiKey = "..."
    VariableDeclarator(path) {
      const name = getIdentifierName(path.node.id);
      const value = getStringValue(path.node.init);

      if (name && value && (isSuspiciousName(name) || isPotentialSecret(value))) {
        findings.push({
          type: 'variable',
          name,
          value,
          location: path.node.loc,
          confidence: isSuspiciousName(name) ? 'high' : 'medium',
          context: {
            variableName: name,
            nodeType: 'VariableDeclarator'
          }
        });
      }
    },

    // Object properties: { apiKey: "..." }
    ObjectProperty(path) {
      const key = getIdentifierName(path.node.key);
      const value = getStringValue(path.node.value);

      if (key && value && (isSuspiciousProperty(key) || isPotentialSecret(value))) {
        // Get parent object context
        let parentName = null;
        if (path.parentPath && path.parentPath.parentPath) {
          const grandParent = path.parentPath.parentPath.node;
          if (grandParent.type === 'VariableDeclarator') {
            parentName = getIdentifierName(grandParent.id);
          }
        }

        findings.push({
          type: 'property',
          name: key,
          value,
          location: path.node.loc,
          confidence: isSuspiciousProperty(key) ? 'high' : 'medium',
          context: {
            propertyName: key,
            parentObject: parentName,
            nodeType: 'ObjectProperty'
          }
        });
      }
    },

    // Assignment expressions: obj.apiKey = "..."
    AssignmentExpression(path) {
      const value = getStringValue(path.node.right);
      if (!value) return;

      let propName = null;
      const left = path.node.left;

      if (left.type === 'MemberExpression' && left.property) {
        propName = getIdentifierName(left.property);
      } else if (left.type === 'Identifier') {
        propName = left.name;
      }

      if (propName && (isSuspiciousProperty(propName) || isSuspiciousName(propName) || isPotentialSecret(value))) {
        findings.push({
          type: 'assignment',
          name: propName,
          value,
          location: path.node.loc,
          confidence: isSuspiciousProperty(propName) || isSuspiciousName(propName) ? 'high' : 'medium',
          context: {
            assignmentTarget: propName,
            nodeType: 'AssignmentExpression'
          }
        });
      }
    },

    // Call expressions: SDK initialization
    CallExpression(path) {
      const callee = path.node.callee;
      const args = path.node.arguments;

      // Check for known SDK patterns
      let sdkName = null;
      let calleeName = null;

      if (callee.type === 'Identifier') {
        calleeName = callee.name;
      } else if (callee.type === 'MemberExpression') {
        const obj = getIdentifierName(callee.object);
        const prop = getIdentifierName(callee.property);
        calleeName = `${obj}.${prop}`;
      }

      if (!calleeName) return;

      // Check for SDK initialization patterns
      const sdkPatterns = {
        'Stripe': /^Stripe$/,
        'AWS.Config': /^AWS\.(Config|S3|DynamoDB|Lambda|SQS|SNS)/,
        'Firebase': /firebase\.initializeApp|initializeApp/,
        'Supabase': /createClient/,
        'Twilio': /^Twilio$/,
        'SendGrid': /setApiKey|MailService/,
        'Algolia': /algoliasearch/,
        'Pusher': /^Pusher$/,
        'Mixpanel': /mixpanel\.init/,
        'Amplitude': /amplitude\.init/,
        'Segment': /analytics\.load/,
      };

      for (const [sdk, pattern] of Object.entries(sdkPatterns)) {
        if (pattern.test(calleeName)) {
          sdkName = sdk;
          break;
        }
      }

      // Extract string arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const value = getStringValue(arg);

        if (value && isPotentialSecret(value)) {
          findings.push({
            type: 'call',
            name: calleeName,
            value,
            location: path.node.loc,
            confidence: sdkName ? 'high' : 'medium',
            context: {
              functionName: calleeName,
              argumentIndex: i,
              sdkName,
              nodeType: 'CallExpression'
            }
          });
        }

        // Check object arguments for secrets
        if (arg.type === 'ObjectExpression') {
          for (const prop of arg.properties) {
            if (prop.type !== 'ObjectProperty') continue;

            const propKey = getIdentifierName(prop.key);
            const propValue = getStringValue(prop.value);

            if (propKey && propValue && (isSuspiciousProperty(propKey) || isPotentialSecret(propValue))) {
              findings.push({
                type: 'call_config',
                name: `${calleeName}.${propKey}`,
                value: propValue,
                location: prop.loc,
                confidence: sdkName || isSuspiciousProperty(propKey) ? 'high' : 'medium',
                context: {
                  functionName: calleeName,
                  configProperty: propKey,
                  sdkName,
                  nodeType: 'CallExpression.ObjectProperty'
                }
              });
            }
          }
        }
      }
    },

    // New expressions: new AWS.S3({...})
    NewExpression(path) {
      // Delegate to CallExpression visitor logic
      visitors.CallExpression(path);
    }
  };

  try {
    babelTraverse(ast, visitors);
  } catch (error) {
    console.warn('[BlueHawk AST] Traverse error:', error.message);
  }

  return findings;
}

/**
 * Full analysis pipeline: parse + analyze
 */
export async function analyzeCode(code, options = {}) {
  const ast = await parseCode(code, options);
  if (!ast) return { ast: null, findings: [], error: 'Parse failed' };

  const findings = await analyzeAST(ast, options);

  return {
    ast,
    findings,
    error: null
  };
}

/**
 * Analyze multiple scripts in parallel
 */
export async function analyzeScripts(scripts, options = {}) {
  const { maxConcurrency = 4, onProgress } = options;

  const results = [];
  const queue = [...scripts];
  let completed = 0;

  async function processNext() {
    const script = queue.shift();
    if (!script) return;

    try {
      const result = await analyzeCode(script.content, {
        filename: script.url || script.filename
      });
      results.push({
        script,
        ...result
      });
    } catch (error) {
      results.push({
        script,
        findings: [],
        error: error.message
      });
    }

    completed++;
    if (onProgress) {
      onProgress(completed, scripts.length);
    }

    if (queue.length > 0) {
      await processNext();
    }
  }

  // Process with concurrency limit
  const workers = [];
  for (let i = 0; i < Math.min(maxConcurrency, scripts.length); i++) {
    workers.push(processNext());
  }

  await Promise.all(workers);

  return results;
}

/**
 * Check if Babel is available/loaded
 */
export async function isBabelAvailable() {
  try {
    await loadParser();
    await loadTraverse();
    return true;
  } catch {
    return false;
  }
}

export default {
  parseCode,
  analyzeAST,
  analyzeCode,
  analyzeScripts,
  isBabelAvailable,
  isSuspiciousName,
  isSuspiciousProperty,
  isPotentialSecret
};
