const youtubeDomains = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'googlevideo.com',
  'ytimg.com',
  'youtubei.googleapis.com',
  'youtube.googleapis.com',
  'youtubeembeddedplayer.googleapis.com',
  'ggpht.com',
  'gvt1.com',
];

const chatgptDomains = [
  'chatgpt.com',
  'openai.com',
  'chat.openai.com',
  'api.openai.com',
  'auth.openai.com',
  'cdn.openai.com',
  'oaistatic.com',
  'oaiusercontent.com',
  'ab.chatgpt.com',
  'ws.chatgpt.com',
  'openaiapi-site.azureedge.net',
];

const backgroundExactDomains = new Set([
  'accounts.google.com',
  'accountcapabilities-pa.googleapis.com',
  'android.clients.google.com',
  'b1.nel.goog',
  'chromewebstore.googleapis.com',
  'substrate.office.com',
  'edge-consumer-static.azureedge.net',
  'safebrowsing.googleapis.com',
  'securitydomain-pa.googleapis.com',
  'main.vscode-cdn.net',
  'default.exp-tas.com',
  'clients2.googleusercontent.com',
  'clients4.google.com',
  'ogads-pa.clients6.google.com',
  'update.googleapis.com',
  'clientservices.googleapis.com',
  'optimizationguide-pa.googleapis.com',
  'play.googleapis.com',
  'www.googleapis.com',
  'content-autofill.googleapis.com',
  'fonts.googleapis.com',
  'google-analytics.com',
  'googletagmanager.com',
  'gstatic.com',
  'tagmanager.google.com',
  'www.googletagmanager.com',
  'connectivitycheck.gstatic.com',
  'detectportal.firefox.com',
  'firefox.settings.services.mozilla.com',
  'push.services.mozilla.com',
  'browser.events.data.microsoft.com',
  'cs.dds.microsoft.com',
  'officecdn.microsoft.com',
  'self.events.data.microsoft.com',
  'settings-win.data.microsoft.com',
  'v10.events.data.microsoft.com',
  'watson.telemetry.microsoft.com',
  'edge.microsoft.com',
  'graph.microsoft.com',
  'login.live.com',
  'msftconnecttest.com',
  'msftncsi.com',
  'ssl.gstatic.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
]);

const backgroundSuffixes = [
  '.events.data.microsoft.com',
  '.telemetry.microsoft.com',
  '.aria.microsoft.com',
  '.vscode-cdn.net',
  '.windowsupdate.com',
  '.update.microsoft.com',
  '.delivery.mp.microsoft.com',
  '.dsp.mp.microsoft.com',
  '.mp.microsoft.com',
  '.msftconnecttest.com',
  '.msedge.net',
  '.office.net',
  '.office365.com',
  '.officecdn.microsoft.com',
  '.dds.microsoft.com',
  '.exp-tas.com',
  '.trafficmanager.net',
  '.azureedge.net',
  '.akadns.net',
  '.akadns6.net',
  '.akamaiedge.net',
  '.akamaihd.net',
  '.cloudflare.com',
  '.doubleclick.net',
  '.googlesyndication.com',
  '.googleadservices.com',
  '.google-analytics.com',
  '.googletagmanager.com',
  '.googleoptimize.com',
  '.googleapis.com',
  '.googleusercontent.com',
  '.gstatic.com',
  '.gvt2.com',
  '.nel.goog',
];

const backgroundPatterns = [
  /(^|\.)clients\d*\.google\.com$/,
  /(^|\.)clients\d*\.googleusercontent\.com$/,
  /(^|\.)[-a-z0-9]+-pa\.googleapis\.com$/,
  /^lh\d+\.google\.com$/,
];

export function normalizeDomain(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

export function domainMatches(domain, ruleDomain) {
  const normalized = normalizeDomain(domain);
  const rule = normalizeDomain(ruleDomain);
  return normalized === rule || normalized.endsWith(`.${rule}`);
}

export function expandedDomainRules(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return [];
  if (youtubeDomains.some((rule) => domainMatches(normalized, rule))) {
    return youtubeDomains;
  }
  if (chatgptDomains.some((rule) => domainMatches(normalized, rule))) {
    return chatgptDomains;
  }
  return [normalized];
}

export function displayDomainFor(domain) {
  const normalized = normalizeDomain(domain);
  if (youtubeDomains.some((rule) => domainMatches(normalized, rule))) return 'youtube.com';
  if (chatgptDomains.some((rule) => domainMatches(normalized, rule))) return 'chatgpt.com';
  if (normalized === 'google.com' || normalized === 'google.co.in') return 'google.com';
  return normalized;
}

export function isUserFacingDomain(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized || normalized === 'localhost') return false;
  if (isIpv4(normalized) || normalized.endsWith('.arpa') || normalized.endsWith('.local')) return false;
  if (youtubeDomains.some((rule) => domainMatches(normalized, rule))) return true;
  if (chatgptDomains.some((rule) => domainMatches(normalized, rule))) return true;
  if (backgroundExactDomains.has(normalized)) return false;
  if (backgroundPatterns.some((pattern) => pattern.test(normalized))) return false;
  if (matchesBackgroundSuffix(normalized)) return false;
  if (normalized.includes('safebrowsing') || normalized.includes('telemetry')) return false;
  return true;
}

export function domainView(domain) {
  const normalized = normalizeDomain(domain);
  return {
    domain: normalized,
    displayDomain: displayDomainFor(normalized),
    userFacing: isUserFacingDomain(normalized),
  };
}

function isIpv4(value) {
  const parts = value.split('.');
  return parts.length === 4 && parts.every((part) => {
    const number = Number.parseInt(part, 10);
    return String(number) === part && number >= 0 && number <= 255;
  });
}

function matchesBackgroundSuffix(domain) {
  return backgroundSuffixes.some((suffix) => {
    const apex = suffix.startsWith('.') ? suffix.slice(1) : suffix;
    return domain === apex || domain.endsWith(suffix);
  });
}
