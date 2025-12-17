// Background Service Worker - BlueHawk API Key Finder
// Manages notifications, webhooks, and storage

console.log('🦅 BlueHawk API Key Finder - Background Service Worker started');

// Global Deep Scan state
let deepScanState = {
  isRunning: false,
  tabId: null,
  startTime: null,
  progress: {
    pagesVisited: 0,
    scriptsAnalyzed: 0,
    tokensFound: 0
  },
  results: null
};

// Initialize default settings
chrome.runtime.onInstalled.addListener(async () => {
  const defaultSettings = {
    autoScanEnabled: true,
    notificationsEnabled: true,
    discordWebhookEnabled: false,
    discordWebhookUrl: '',
    saveHistory: true,
    scanDelay: 5000, // 5 seconds after load (increased to avoid site freezing)
    minTokenLength: 15,

    // Domain filter
    skipSocialMediaScan: true, // Skip social media by default

    // Proxy settings
    proxyEnabled: false,
    proxyHost: '127.0.0.1',
    proxyPort: 8080
  };

  // Check if settings already exist
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({ settings: defaultSettings });
    console.log('⚙️ Configurações padrão criadas');
  }

  // Initialize history if not exists
  const { history } = await chrome.storage.local.get('history');
  if (!history) {
    await chrome.storage.local.set({ history: [] });
    console.log('📚 Histórico inicializado');
  }
});

// Unified listener for all messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Content script messages
  if (request.action === 'tokensFound') {
    if (sender.tab) {
      handleTokensFound(request.data, sender.tab);
    } else {
      console.warn('⚠️ tokensFound recebido sem tab associado');
    }
    sendResponse({ status: 'received' });
  } else if (request.action === 'manualScan') {
    if (sender.tab) {
      handleManualScan(request.data, sender.tab);
    } else {
      console.warn('⚠️ manualScan recebido sem tab associado');
    }
    sendResponse({ status: 'received' });
  } else if (request.action === 'deepScanStarted') {
    // Deep scan started
    deepScanState.isRunning = true;
    deepScanState.tabId = sender.tab?.id || null;
    deepScanState.startTime = Date.now();
    deepScanState.progress = request.progress || { pagesVisited: 0, scriptsAnalyzed: 0, tokensFound: 0 };
    console.log('🕷️ Deep Scan iniciado e registrado no background');
    sendResponse({ status: 'registered' });
  } else if (request.action === 'deepScanProgress') {
    // Update deep scan progress
    if (deepScanState.isRunning) {
      deepScanState.progress = request.progress;
      console.log('📊 Progresso Deep Scan:', request.progress);
    }
    sendResponse({ status: 'updated' });
  } else if (request.action === 'deepScanCompleted') {
    // Deep scan complete
    deepScanState.isRunning = false;
    deepScanState.results = request.data;
    console.log('✅ Deep Scan completo e salvo no background');

    // Save to history
    if (sender.tab) {
      handleManualScan(request.data, sender.tab);
    }
    sendResponse({ status: 'completed' });
  } else if (request.action === 'getDeepScanState') {
    // Return current deep scan state
    sendResponse({
      status: 'success',
      state: deepScanState
    });
  } else if (request.action === 'markTokenViewed') {
    // Mark token as viewed
    markTokenAsViewed(request.tokenId, request.tokenValue).then(result => {
      sendResponse(result);
    });
    return true;
  }
  // Export and statistics actions
  else if (request.action === 'exportHistory') {
    exportHistory().then(sendResponse);
    return true;
  } else if (request.action === 'clearHistory') {
    clearHistory().then(sendResponse);
    return true;
  } else if (request.action === 'getStats') {
    getStats().then(sendResponse);
    return true;
  } else if (request.action === 'exportForPentest') {
    exportForPentest().then(sendResponse);
    return true;
  } else if (request.action === 'exportNucleiTemplate') {
    exportNucleiTemplate().then(sendResponse);
    return true;
  }
  return true;
});

// Process found tokens
async function handleTokensFound(foundTokens, tab) {
  if (!tab) {
    console.error('❌ handleTokensFound: tab é undefined');
    return;
  }

  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    console.error('❌ handleTokensFound: settings não encontradas');
    return;
  }

  // Validate foundTokens structure
  if (!foundTokens || !foundTokens.tokens || !Array.isArray(foundTokens.tokens)) {
    console.error('❌ Estrutura de foundTokens inválida:', foundTokens);
    return;
  }

  if (foundTokens.tokens.length === 0) {
    console.log('✅ Nenhum token encontrado em:', tab.url);
    return;
  }

  console.log(`🔍 ${foundTokens.tokens.length} tokens encontrados em:`, tab.url);

  // Check if there are valid tokens
  const validTokens = foundTokens.tokens.filter(t => t.validation?.valid === true);
  const hasValidTokens = validTokens.length > 0;

  if (hasValidTokens) {
    console.log(`⚠️ ALERTA CRÍTICO: ${validTokens.length} token(s) válido(s) encontrado(s)!`);

    // Alert badge for valid tokens
    chrome.action.setBadgeText({ text: '⚠️' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

    // Critical notification
    if (settings.notificationsEnabled) {
      await sendCriticalNotification(validTokens.length, foundTokens.tokens.length, tab);
    }
  } else {
    // Send normal notification
    if (settings.notificationsEnabled) {
      await sendNotification(foundTokens.tokens.length, tab);
    }
  }

  // Save to history
  if (settings.saveHistory) {
    await saveToHistory(foundTokens, tab);
  }

  // Send to Discord
  if (settings.discordWebhookEnabled && settings.discordWebhookUrl) {
    await sendToDiscord(foundTokens, tab, settings.discordWebhookUrl);
  }
}

// Process manual scan
async function handleManualScan(foundTokens, tab) {
  if (!tab) {
    console.error('❌ handleManualScan: tab é undefined');
    return;
  }

  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    console.error('❌ handleManualScan: settings não encontradas');
    return;
  }

  // Validate foundTokens structure
  if (!foundTokens || !foundTokens.tokens || !Array.isArray(foundTokens.tokens)) {
    console.error('❌ Estrutura de foundTokens inválida:', foundTokens);
    return;
  }

  console.log(`📋 Scan manual: ${foundTokens.tokens.length} tokens em:`, tab.url);

  // Save to history
  if (settings.saveHistory) {
    await saveToHistory(foundTokens, tab);
  }

  // Send to Discord se configurado
  if (settings.discordWebhookEnabled && settings.discordWebhookUrl) {
    await sendToDiscord(foundTokens, tab, settings.discordWebhookUrl);
  }
}

// Save tokens to history
async function saveToHistory(foundTokens, tab) {
  if (!tab) {
    console.error('❌ saveToHistory: tab é undefined');
    return;
  }

  try {
    const { history = [] } = await chrome.storage.local.get('history');

    const entry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      url: tab.url || 'URL desconhecida',
      title: tab.title || 'Título desconhecido',
      favicon: tab.favIconUrl || '',
      tokensCount: foundTokens.tokens?.length || 0,
      tokens: foundTokens.tokens || [],
      scriptsAnalyzed: foundTokens.scriptsAnalyzed || 0
    };

    // Add at beginning of array (most recent first)
    history.unshift(entry);

    // Limit history to 500 entries
    const limitedHistory = history.slice(0, 500);

    await chrome.storage.local.set({ history: limitedHistory });
    console.log('💾 Tokens salvos no histórico');
  } catch (error) {
    console.error('❌ Erro ao salvar histórico:', error);
  }
}

// Send notification
async function sendNotification(tokenCount, tab) {
  if (!tab) {
    console.error('❌ sendNotification: tab é undefined');
    return;
  }

  try {
    const notificationId = `tokens-${Date.now()}`;
    const tabInfo = tab.title || tab.url || 'Site desconhecido';

    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '🦅 Hardcoded Tokens Detected!',
      message: `Encontrados ${tokenCount} token(s) em:\n${truncateText(tabInfo, 60)}`,
      priority: 2,
      requireInteraction: true,
      buttons: [
        { title: '👁️ Ver Detalhes' },
        { title: '📋 Ver Histórico' }
      ]
    });

    console.log('🔔 Notificação enviada');
  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error);
  }
}

// Send notification critical for valid tokens
async function sendCriticalNotification(validCount, totalCount, tab) {
  if (!tab) {
    console.error('❌ sendCriticalNotification: tab é undefined');
    return;
  }

  try {
    const notificationId = `critical-${Date.now()}`;
    const tabInfo = tab.title || tab.url || 'Site desconhecido';

    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '🚨 CRITICAL ALERT: Valid Tokens Detected!',
      message: `⚠️ ${validCount} token(s) VÁLIDO(S) de ${totalCount} encontrados em:\n${truncateText(tabInfo, 50)}\n\nAÇÃO NECESSÁRIA IMEDIATA!`,
      priority: 2,
      requireInteraction: true,
      buttons: [
        { title: '🚨 Ver Agora' },
        { title: '📋 Ver Histórico' }
      ]
    });

    console.log('🚨 Notificação crítica enviada');
  } catch (error) {
    console.error('❌ Erro ao enviar notificação crítica:', error);
  }
}

// Listener for notification clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // View Details - open popup
    const windows = await chrome.windows.getAll();
    if (windows.length > 0) {
      chrome.action.openPopup();
    }
  } else if (buttonIndex === 1) {
    // View History - open history page
    chrome.tabs.create({ url: 'history.html' });
  }
  chrome.notifications.clear(notificationId);
});

// Send to Discord Webhook
async function sendToDiscord(foundTokens, tab, webhookUrl) {
  if (!tab) {
    console.error('❌ sendToDiscord: tab é undefined');
    return;
  }

  try {
    // Validate foundTokens structure
    if (!foundTokens || !foundTokens.tokens || !Array.isArray(foundTokens.tokens)) {
      console.error('❌ sendToDiscord: Estrutura de foundTokens inválida:', foundTokens);
      return;
    }

    const tabUrl = tab.url || 'URL desconhecida';
    const tabTitle = tab.title || 'Sem título';

    // Count validated tokens
    const validTokens = foundTokens.tokens.filter(t => t.validation?.valid === true);
    const invalidTokens = foundTokens.tokens.filter(t => t.validation?.valid === false);
    const unvalidatedTokens = foundTokens.tokens.filter(t => t.validation?.valid === null || t.validation?.valid === undefined);

    // Set embed color based on severity
    let embedColor = 0xF5576C; // Default pink
    if (validTokens.length > 0) {
      embedColor = 0xFF0000; // Red for valid tokens
    }

    const embed = {
      title: validTokens.length > 0 ? '🚨 CRITICAL ALERT: Valid Tokens Detected!' : '🦅 Hardcoded Tokens Detected',
      description: `**${foundTokens.tokens.length}** token(s) encontrado(s)${validTokens.length > 0 ? `\n\n⚠️ **${validTokens.length} TOKEN(S) VÁLIDO(S) E ATIVO(S)!**` : ''}`,
      color: embedColor,
      url: tabUrl,
      fields: [
        {
          name: '🌐 Site',
          value: truncateText(tabTitle, 256),
          inline: false
        },
        {
          name: '🔗 URL',
          value: truncateText(tabUrl, 256),
          inline: false
        },
        {
          name: '📄 Scripts Analisados',
          value: (foundTokens.scriptsAnalyzed || 0).toString(),
          inline: true
        },
        {
          name: '🔑 Tokens Encontrados',
          value: foundTokens.tokens.length.toString(),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'BlueHawk API Key Finder by fbettag',
        icon_url: 'https://github.com/fbettag.png'
      }
    };

    // Add validation summary if there are validated tokens
    if (validTokens.length > 0 || invalidTokens.length > 0 || unvalidatedTokens.length > 0) {
      embed.fields.push({
        name: '🔐 Status de Validação',
        value: `✅ Válidos: **${validTokens.length}**\n❌ Inválidos: **${invalidTokens.length}**\n⚠️ Não validados: **${unvalidatedTokens.length}**`,
        inline: false
      });
    }

    // Add tokens to embed (max 10 to avoid limit)
    const tokensToShow = foundTokens.tokens.slice(0, 10);
    tokensToShow.forEach((token, index) => {
      const tokenValue = truncateText(token.value, 100);
      const scriptUrl = truncateText(token.scriptUrl, 200);

      // Determine validation status
      let validationIcon = '⚠️';
      let validationStatus = 'Não validado';

      if (token.validation) {
        if (token.validation.valid === true) {
          validationIcon = '✅';
          validationStatus = `**VÁLIDO**: ${token.validation.status}`;
          if (token.validation.severity) {
            validationStatus += ` (${token.validation.severity})`;
          }
        } else if (token.validation.valid === false) {
          validationIcon = '❌';
          validationStatus = `Inválido: ${token.validation.status}`;
        } else {
          validationIcon = '⚠️';
          validationStatus = token.validation.status || 'Não foi possível validar';
        }
      }

      embed.fields.push({
        name: `${getTypeEmoji(token.type)} ${validationIcon} Token ${index + 1}: ${token.type}`,
        value: `\`\`\`\n${tokenValue}\n\`\`\`\n📄 Script: ${scriptUrl}\n🔐 **Status:** ${validationStatus}`,
        inline: false
      });
    });

    // If there are more tokens, add note
    if (foundTokens.tokens.length > 10) {
      embed.fields.push({
        name: '⚠️ Aviso',
        value: `Mais ${foundTokens.tokens.length - 10} token(s) encontrado(s). Veja o histórico completo na extensão.`,
        inline: false
      });
    }

    const payload = {
      username: 'BlueHawk API Key Finder',
      avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
      embeds: [embed]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Tokens enviados para Discord');
    } else {
      console.error('❌ Erro ao enviar para Discord:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar para Discord:', error);
  }
}

// Helper functions
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function getTypeEmoji(type) {
  const emojis = {
    'API_KEY': '🔑',
    'JWT': '🎫',
    'AWS': '☁️',
    'GITHUB': '🐙',
    'GITLAB': '🦊',
    'VERCEL': '▲',
    'SUPABASE': '⚡',
    'SLACK': '💬',
    'STRIPE': '💳',
    'FIREBASE': '🔥',
    'GOOGLE': '🔍',
    'FACEBOOK': '👤',
    'TWITTER': '🐦',
    'PASSWORD': '🔐',
    'SECRET': '🤫',
    'TOKEN': '🎟️',
    'PRIVATE_KEY': '🔒'
  };
  return emojis[type] || '⚠️';
}

// Update extension icon based on mode (red for auto, blue for manual)
function updateExtensionIcon(isAutoMode) {
  const iconSuffix = isAutoMode ? '-red' : '';
  chrome.action.setIcon({
    path: {
      16: `icons/icon16${iconSuffix}.png`,
      48: `icons/icon48${iconSuffix}.png`,
      128: `icons/icon128${iconSuffix}.png`
    }
  }).catch(err => {
    console.error('Error updating icon:', err);
  });
}

// Initialize extension state (Badge, Icon, and Proxy) after settings are ready
async function initializeExtensionState() {
  try {
    const { settings } = await chrome.storage.local.get('settings');

    if (!settings) {
      console.log('⚠️ Settings not initialized, setting defaults...');
      updateExtensionIcon(false);
      return;
    }

    // Update icon and clear badge
    updateExtensionIcon(settings.autoScanEnabled);
    chrome.action.setBadgeText({ text: '' });

    // Configure proxy if enabled
    if (settings.proxyEnabled) {
      await configureProxy(settings);
    }

    console.log('✅ Estado da extensão inicializado');
  } catch (error) {
    console.error('❌ Erro ao inicializar estado da extensão:', error);
  }
}

// Call initialization with delay to ensure onInstalled completes
setTimeout(initializeExtensionState, 100);

// Listener for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings && changes.settings.newValue) {
    const newSettings = changes.settings.newValue;
    const oldSettings = changes.settings.oldValue || {};

    // Update icon when auto mode changes
    if (newSettings.autoScanEnabled !== oldSettings.autoScanEnabled) {
      updateExtensionIcon(newSettings.autoScanEnabled);
    }

    // Clear badge
    chrome.action.setBadgeText({ text: '' });

    // Update proxy configuration
    if (newSettings.proxyEnabled !== oldSettings.proxyEnabled ||
        newSettings.proxyHost !== oldSettings.proxyHost ||
        newSettings.proxyPort !== oldSettings.proxyPort) {
      configureProxy(newSettings);
    }
  }
});

// Configure proxy
async function configureProxy(settings) {
  try {
    if (!settings) {
      console.error('❌ configureProxy: settings é undefined');
      return;
    }

    if (settings.proxyEnabled && settings.proxyHost && settings.proxyPort) {
      const proxyConfig = {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: "http",
            host: settings.proxyHost,
            port: parseInt(settings.proxyPort, 10)
          },
          bypassList: []
        }
      };

      await chrome.proxy.settings.set({
        value: proxyConfig,
        scope: 'regular'
      });

      console.log(`✅ Proxy configurado: ${settings.proxyHost}:${settings.proxyPort}`);

      // Update badge to indicate active proxy
      chrome.action.setBadgeText({ text: 'PROXY' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF6B35' });
    } else {
      // Disable proxy
      await chrome.proxy.settings.clear({
        scope: 'regular'
      });

      console.log('✅ Proxy desabilitado');

      // Restore previous badge
      if (settings && settings.autoScanEnabled) {
        chrome.action.setBadgeText({ text: '●' });
        chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      } else {
        chrome.action.setBadgeText({ text: '●' });
        chrome.action.setBadgeBackgroundColor({ color: '#f97316' });
      }
    }
  } catch (error) {
    console.error('❌ Erro ao configurar proxy:', error);
  }
}

// Removed: initialization moved to initializeExtensionState()
// Removed: duplicate listener merged with main one

// Export history
async function exportHistory() {
  try {
    const { history = [] } = await chrome.storage.local.get('history');
    return {
      success: true,
      data: history,
      count: history.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Clear history
async function clearHistory() {
  try {
    await chrome.storage.local.set({ history: [] });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get statistics
async function getStats() {
  try {
    const { history = [] } = await chrome.storage.local.get('history');

    // Filter valid URLs for uniqueSites
    const validUrls = history
      .map(e => {
        try {
          return new URL(e.url).hostname;
        } catch {
          return null;
        }
      })
      .filter(hostname => hostname !== null);

    const stats = {
      totalScans: history.length,
      totalTokens: history.reduce((sum, entry) => sum + entry.tokensCount, 0),
      uniqueSites: [...new Set(validUrls)].length,
      lastScan: history[0] ? history[0].timestamp : null
    };

    return { success: true, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Mark token as viewed in history
async function markTokenAsViewed(tokenId, tokenValue) {
  try {
    const { history = [] } = await chrome.storage.local.get('history');
    let found = false;

    // Search and update token in all history entries
    for (const entry of history) {
      for (const token of entry.tokens) {
        if ((token.id && token.id === tokenId) || token.value === tokenValue) {
          token.viewed = true;
          token.viewedAt = new Date().toISOString();
          found = true;
        }
      }
    }

    if (found) {
      await chrome.storage.local.set({ history });
      console.log('💾 Token marcado como visualizado no histórico');
      return { success: true, message: 'Token marcado como visualizado' };
    } else {
      console.warn('⚠️ Token não encontrado no histórico');
      return { success: false, message: 'Token não encontrado' };
    }
  } catch (error) {
    console.error('❌ Erro ao marcar token como visualizado:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// EXPORT FOR PENTEST TOOLS
// ========================================

// Export in pentest-optimized format (structured JSON)
async function exportForPentest() {
  try {
    const { history = [] } = await chrome.storage.local.get('history');

    // Group tokens by type and severity
    const tokensBySeverity = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: []
    };

    const endpoints = [];
    const domains = new Set();

    for (const entry of history) {
      domains.add(new URL(entry.url).hostname);

      for (const token of entry.tokens) {
        const severity = token.severity || 'MEDIUM';

        tokensBySeverity[severity].push({
          type: token.type,
          value: token.value,
          url: entry.url,
          scriptUrl: token.scriptUrl,
          timestamp: token.timestamp,
          validation: token.validation
        });
      }

      // Collect endpoints
      if (entry.endpoints) {
        endpoints.push(...entry.endpoints);
      }
    }

    const pentestData = {
      generated: new Date().toISOString(),
      tool: 'BlueHawk API Key Finder',
      summary: {
        total_tokens: history.reduce((sum, e) => sum + e.tokensCount, 0),
        critical: tokensBySeverity.CRITICAL.length,
        high: tokensBySeverity.HIGH.length,
        medium: tokensBySeverity.MEDIUM.length,
        low: tokensBySeverity.LOW.length,
        domains_scanned: domains.size,
        endpoints_found: endpoints.length
      },
      tokens_by_severity: tokensBySeverity,
      endpoints,
      domains: Array.from(domains)
    };

    return {
      success: true,
      data: pentestData,
      filename: `pentest-tokens-${Date.now()}.json`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Export Nuclei template for found endpoints
async function exportNucleiTemplate() {
  try {
    const { history = [] } = await chrome.storage.local.get('history');

    const endpoints = [];
    for (const entry of history) {
      if (entry.endpoints) {
        endpoints.push(...entry.endpoints.map(e => e.url));
      }
    }

    const uniqueEndpoints = [...new Set(endpoints)];

    const nucleiTemplate = {
      id: 'hardcoded-tokens-scan',
      info: {
        name: 'Hardcoded Tokens and Endpoints Scanner',
        author: 'fbettag',
        severity: 'high',
        description: 'Scans for hardcoded tokens and sensitive endpoints discovered by BlueHawk API Key Finder',
        tags: ['tokens', 'secrets', 'hardcoded']
      },
      requests: [
        {
          method: 'GET',
          path: uniqueEndpoints.slice(0, 50), // Limitar a 50 endpoints
          matchers: [
            {
              type: 'status',
              status: [200]
            }
          ]
        }
      ]
    };

    return {
      success: true,
      data: nucleiTemplate,
      filename: `nuclei-template-${Date.now()}.yaml`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
