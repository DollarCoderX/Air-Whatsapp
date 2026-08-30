// Central place for env var access
function required(name, fallback) {
  const v = process.env[name];
  if (v !== undefined && v !== '') return v;
  return fallback;
}

// Build a deduplicated GROQ key list from both GROQ_KEYS (comma-sep) and GROQ_API_KEY (single)
const _groqMulti = (process.env.GROQ_KEYS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const _groqSingle = (process.env.GROQ_API_KEY || '').trim();
if (_groqSingle && !_groqMulti.includes(_groqSingle)) {
  _groqMulti.push(_groqSingle);
}

// Add support for legacy single-key env var `GROQ_KEY` and local defaults
const DEFAULT_GROQ_KEYS = [
  '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',
  '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'
];

const envLegacy = (process.env.GROQ_KEY || '').trim();
if (envLegacy && !_groqMulti.includes(envLegacy)) _groqMulti.push(envLegacy);

// If no keys configured in env, use provided local defaults
if (!_groqMulti.length) {
  for (const k of DEFAULT_GROQ_KEYS) if (!_groqMulti.includes(k)) _groqMulti.push(k);
}

module.exports = {
  GROQ_KEYS: _groqMulti,
  GROQ_TTS_KEY: required('GROQ_TTS_KEY', _groqSingle || (_groqMulti[0] || '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')),

  GEMINI_API_KEY: required('GEMINI_API_KEY', ''),
  GEMINI_MODEL: required('GEMINI_MODEL', 'gemini-1.5-flash'),

  GOOGLE_API_KEY: required('GOOGLE_API_KEY', ''),
  SERPER_API_KEY: required('SERPER_API_KEY', ''),
  NEWS_API_KEY: required('NEWS_API_KEY', ''),
};
