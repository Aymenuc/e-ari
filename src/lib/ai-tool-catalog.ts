/**
 * Shadow AI Discovery — curated catalog of AI tools + matching engine.
 *
 * The catalog is the long-term asset: every SSO/expense import is matched
 * against it to surface undeclared AI usage. Seeded with ~80 widely-deployed
 * tools; grows weekly (unmatched imports feed the backlog).
 *
 * trainsOnData: 'yes' | 'default_on' | 'opt_in' | 'no' | 'configurable' | 'unknown'
 *   — refers to the tool's CONSUMER/default tier, the one shadow users have.
 */

export interface CatalogEntry {
  id: string;
  name: string;
  aliases: string[];
  domains: string[];
  category: string;
  vendor: string;
  trainsOnData: 'yes' | 'default_on' | 'opt_in' | 'no' | 'configurable' | 'unknown';
  risk: 'low' | 'medium' | 'high';
  note: string;
}

export const CATALOG_VERSION = '1.0.0';

const T = (
  id: string, name: string, aliases: string[], domains: string[], category: string,
  vendor: string, trainsOnData: CatalogEntry['trainsOnData'], risk: CatalogEntry['risk'], note: string,
): CatalogEntry => ({ id, name, aliases, domains, category, vendor, trainsOnData, risk, note });

export const AI_TOOL_CATALOG: CatalogEntry[] = [
  T('chatgpt', 'ChatGPT', ['openai chatgpt', 'chat gpt', 'gpt'], ['chat.openai.com', 'chatgpt.com'], 'General assistant', 'OpenAI', 'default_on', 'high', 'Consumer tier trains on chats by default; free-tier shadow use is the #1 data-leak vector.'),
  T('openai-api', 'OpenAI API', ['openai platform', 'openai api'], ['platform.openai.com', 'api.openai.com'], 'LLM API', 'OpenAI', 'no', 'medium', 'API tier has zero-retention options; verify which endpoints teams use.'),
  T('claude', 'Claude', ['anthropic claude', 'claude ai'], ['claude.ai', 'anthropic.com'], 'General assistant', 'Anthropic', 'opt_in', 'medium', 'Does not train on conversations by default.'),
  T('gemini', 'Google Gemini', ['bard', 'gemini app'], ['gemini.google.com'], 'General assistant', 'Google', 'default_on', 'high', 'Consumer Gemini may use conversations for improvement; Workspace tier differs.'),
  T('copilot-ms', 'Microsoft Copilot', ['bing chat', 'copilot chat', 'm365 copilot'], ['copilot.microsoft.com'], 'General assistant', 'Microsoft', 'configurable', 'medium', 'Enterprise tenant vs consumer mode have very different data terms.'),
  T('github-copilot', 'GitHub Copilot', ['copilot code'], ['github.com/features/copilot', 'copilot.github.com'], 'Code assistant', 'GitHub/Microsoft', 'configurable', 'medium', 'Code snippets telemetry configurable at org level; check IP-indemnity plan.'),
  T('cursor', 'Cursor', ['cursor ide', 'anysphere'], ['cursor.sh', 'cursor.com'], 'Code assistant', 'Anysphere', 'configurable', 'medium', 'Privacy mode available; default sends code context to models.'),
  T('codeium', 'Codeium / Windsurf', ['windsurf'], ['codeium.com', 'windsurf.com'], 'Code assistant', 'Codeium', 'configurable', 'medium', 'Free tier processes code server-side.'),
  T('perplexity', 'Perplexity', ['perplexity ai'], ['perplexity.ai'], 'AI search', 'Perplexity', 'default_on', 'medium', 'Consumer default uses data for improvement; Enterprise opts out.'),
  T('midjourney', 'Midjourney', [], ['midjourney.com'], 'Image generation', 'Midjourney', 'yes', 'medium', 'Public by default on lower tiers — prompts and images visible to others.'),
  T('dall-e', 'DALL·E', ['dalle'], ['labs.openai.com'], 'Image generation', 'OpenAI', 'default_on', 'medium', 'Part of ChatGPT consumer terms.'),
  T('stable-diffusion', 'Stability AI', ['dreamstudio', 'stable diffusion'], ['stability.ai', 'dreamstudio.ai'], 'Image generation', 'Stability AI', 'unknown', 'medium', 'Terms vary by product.'),
  T('grammarly', 'Grammarly', [], ['grammarly.com'], 'Writing assistant', 'Grammarly', 'configurable', 'medium', 'Processes full text of everything typed; enterprise tier restricts training.'),
  T('notion-ai', 'Notion AI', ['notion'], ['notion.so', 'notion.com'], 'Workspace AI', 'Notion', 'no', 'low', 'States customer data not used for training; AI features send content to subprocessors.'),
  T('jasper', 'Jasper', ['jasper ai'], ['jasper.ai'], 'Marketing copy', 'Jasper', 'unknown', 'medium', 'Marketing content generation.'),
  T('copy-ai', 'Copy.ai', [], ['copy.ai'], 'Marketing copy', 'Copy.ai', 'unknown', 'medium', ''),
  T('writer', 'Writer', ['writer.com'], ['writer.com'], 'Enterprise writing', 'Writer', 'no', 'low', 'Enterprise-focused, no-training stance.'),
  T('otter', 'Otter.ai', ['otter'], ['otter.ai'], 'Meeting transcription', 'Otter.ai', 'default_on', 'high', 'Joins meetings and records them — consent + confidentiality issues if unapproved.'),
  T('fireflies', 'Fireflies.ai', ['fireflies'], ['fireflies.ai'], 'Meeting transcription', 'Fireflies', 'configurable', 'high', 'Auto-joins calendar meetings; records third parties.'),
  T('read-ai', 'Read AI', ['read.ai'], ['read.ai'], 'Meeting analytics', 'Read AI', 'unknown', 'high', 'Meeting recording + behavioural analytics on participants.'),
  T('fathom', 'Fathom', [], ['fathom.video'], 'Meeting transcription', 'Fathom', 'no', 'medium', ''),
  T('tldv', 'tl;dv', ['tldv'], ['tldv.io'], 'Meeting transcription', 'tl;dv', 'unknown', 'medium', ''),
  T('zoom-ai', 'Zoom AI Companion', ['zoom iq'], ['zoom.us'], 'Meeting AI', 'Zoom', 'no', 'low', 'Zoom states no training on customer content since 2023 policy reversal.'),
  T('teams-copilot', 'Teams Premium / Copilot', [], ['teams.microsoft.com'], 'Meeting AI', 'Microsoft', 'no', 'low', 'Tenant-bound.'),
  T('synthesia', 'Synthesia', [], ['synthesia.io'], 'AI video', 'Synthesia', 'no', 'medium', 'Avatar video; watch for likeness-rights workflows.'),
  T('heygen', 'HeyGen', [], ['heygen.com'], 'AI video', 'HeyGen', 'unknown', 'medium', 'Voice/face cloning features — high misuse potential.'),
  T('elevenlabs', 'ElevenLabs', ['eleven labs'], ['elevenlabs.io'], 'Voice synthesis', 'ElevenLabs', 'configurable', 'high', 'Voice cloning — impersonation risk, deepfake disclosure duties (AI Act Art. 50).'),
  T('descript', 'Descript', [], ['descript.com'], 'Audio/video editing', 'Descript', 'configurable', 'medium', 'Includes voice cloning (Overdub).'),
  T('runway', 'Runway', ['runwayml'], ['runwayml.com'], 'AI video', 'Runway', 'unknown', 'medium', ''),
  T('luma', 'Luma AI', ['dream machine'], ['lumalabs.ai'], 'AI video', 'Luma', 'unknown', 'medium', ''),
  T('suno', 'Suno', [], ['suno.com', 'suno.ai'], 'Music generation', 'Suno', 'unknown', 'low', 'Copyright-status of outputs unsettled.'),
  T('huggingface', 'Hugging Face', ['hugging face'], ['huggingface.co'], 'ML platform', 'Hugging Face', 'no', 'medium', 'Watch for teams uploading datasets/models to public repos.'),
  T('replicate', 'Replicate', [], ['replicate.com'], 'Model hosting', 'Replicate', 'configurable', 'medium', ''),
  T('together-ai', 'Together AI', [], ['together.ai'], 'LLM API', 'Together', 'configurable', 'medium', ''),
  T('groq', 'Groq', [], ['groq.com'], 'LLM API', 'Groq', 'no', 'low', ''),
  T('mistral', 'Mistral / Le Chat', ['le chat'], ['mistral.ai', 'chat.mistral.ai'], 'General assistant', 'Mistral AI', 'opt_in', 'low', 'EU-based provider.'),
  T('deepseek', 'DeepSeek', [], ['deepseek.com', 'chat.deepseek.com'], 'General assistant', 'DeepSeek', 'yes', 'high', 'PRC-based; consumer terms allow broad data use — many orgs block the consumer app.'),
  T('grok', 'Grok', ['xai grok'], ['grok.com', 'x.ai'], 'General assistant', 'xAI', 'default_on', 'high', 'Tied to X data ecosystem.'),
  T('poe', 'Poe', ['quora poe'], ['poe.com'], 'Multi-model chat', 'Quora', 'unknown', 'high', 'Aggregates many models under one consumer ToS.'),
  T('character-ai', 'Character.AI', ['character ai'], ['character.ai'], 'Companion chat', 'Character.AI', 'yes', 'high', 'Consumer entertainment product — no place for work data.'),
  T('you-com', 'You.com', [], ['you.com'], 'AI search', 'You.com', 'unknown', 'medium', ''),
  T('glean', 'Glean', [], ['glean.com'], 'Enterprise search', 'Glean', 'no', 'low', 'Enterprise-grade, tenant-bound.'),
  T('gamma', 'Gamma', ['gamma app'], ['gamma.app'], 'AI presentations', 'Gamma', 'unknown', 'medium', 'Deck content uploaded to generate slides.'),
  T('tome', 'Tome', [], ['tome.app'], 'AI presentations', 'Tome', 'unknown', 'medium', ''),
  T('beautiful-ai', 'Beautiful.ai', [], ['beautiful.ai'], 'AI presentations', 'Beautiful.ai', 'unknown', 'low', ''),
  T('canva-ai', 'Canva (Magic Studio)', ['canva'], ['canva.com'], 'Design AI', 'Canva', 'configurable', 'low', 'AI features governed by Canva ToS; org controls exist.'),
  T('figma-ai', 'Figma AI', ['figma'], ['figma.com'], 'Design AI', 'Figma', 'configurable', 'low', 'Admin toggle for AI features + training.'),
  T('miro-ai', 'Miro AI', ['miro assist'], ['miro.com'], 'Whiteboard AI', 'Miro', 'no', 'low', ''),
  T('slack-ai', 'Slack AI', [], ['slack.com'], 'Workspace AI', 'Salesforce', 'no', 'low', 'Tenant-bound summarisation.'),
  T('zapier-ai', 'Zapier AI', ['zapier'], ['zapier.com'], 'Automation AI', 'Zapier', 'configurable', 'medium', 'AI actions can pipe data across connected apps invisibly.'),
  T('make-ai', 'Make (AI modules)', ['integromat'], ['make.com'], 'Automation AI', 'Make', 'unknown', 'medium', ''),
  T('n8n', 'n8n (AI nodes)', [], ['n8n.io'], 'Automation AI', 'n8n', 'configurable', 'medium', 'Self-hosted option changes the risk profile entirely.'),
  T('intercom-fin', 'Intercom Fin', ['fin ai'], ['intercom.com'], 'Support AI', 'Intercom', 'no', 'low', 'Customer-facing chatbot — AI Act transparency duty applies.'),
  T('zendesk-ai', 'Zendesk AI', [], ['zendesk.com'], 'Support AI', 'Zendesk', 'no', 'low', 'Customer-facing — transparency duty.'),
  T('drift', 'Drift / Salesloft AI', [], ['drift.com'], 'Sales chat AI', 'Salesloft', 'unknown', 'medium', ''),
  T('gong', 'Gong', [], ['gong.io'], 'Revenue intelligence', 'Gong', 'no', 'medium', 'Records sales calls — consent obligations per jurisdiction.'),
  T('chorus', 'Chorus (ZoomInfo)', [], ['chorus.ai'], 'Call intelligence', 'ZoomInfo', 'unknown', 'medium', ''),
  T('apollo-ai', 'Apollo.io AI', ['apollo'], ['apollo.io'], 'Sales AI', 'Apollo', 'unknown', 'medium', 'Contact-data enrichment — GDPR lawful-basis questions.'),
  T('clay', 'Clay', [], ['clay.com'], 'Data enrichment AI', 'Clay', 'unknown', 'medium', ''),
  T('hubspot-ai', 'HubSpot AI (Breeze)', ['breeze'], ['hubspot.com'], 'CRM AI', 'HubSpot', 'no', 'low', ''),
  T('salesforce-einstein', 'Salesforce Einstein', ['einstein gpt', 'agentforce'], ['salesforce.com'], 'CRM AI', 'Salesforce', 'no', 'low', 'Einstein Trust Layer, tenant-bound.'),
  T('linkedin-ai', 'LinkedIn AI tools', [], ['linkedin.com'], 'Recruiting AI', 'Microsoft', 'no', 'medium', 'AI-assisted recruiting can trip Annex III high-risk (employment).'),
  T('hirevue', 'HireVue', [], ['hirevue.com'], 'AI interviewing', 'HireVue', 'no', 'high', 'AI-assisted hiring assessment — squarely Annex III high-risk under the AI Act.'),
  T('paradox-olivia', 'Paradox (Olivia)', ['olivia'], ['paradox.ai'], 'Recruiting chatbot', 'Paradox', 'unknown', 'high', 'Hiring workflow — high-risk category.'),
  T('workday-ai', 'Workday AI', [], ['workday.com'], 'HR AI', 'Workday', 'no', 'high', 'HR decisions — Annex III exposure; needs registry entry.'),
  T('deepl', 'DeepL', [], ['deepl.com'], 'Translation', 'DeepL', 'configurable', 'low', 'Free tier retains texts; Pro does not. Widespread shadow usage.'),
  T('google-translate', 'Google Translate', [], ['translate.google.com'], 'Translation', 'Google', 'yes', 'medium', 'Consumer service; not for confidential documents.'),
  T('quillbot', 'QuillBot', [], ['quillbot.com'], 'Paraphrasing', 'QuillBot', 'unknown', 'medium', ''),
  T('wordtune', 'Wordtune', [], ['wordtune.com'], 'Writing assistant', 'AI21', 'unknown', 'medium', ''),
  T('scribe', 'Scribe', ['scribehow'], ['scribehow.com'], 'Process documentation', 'Scribe', 'unknown', 'medium', 'Screen capture of workflows can include sensitive data.'),
  T('loom-ai', 'Loom AI', ['loom'], ['loom.com'], 'Video messaging AI', 'Atlassian', 'no', 'low', ''),
  T('mem', 'Mem', ['mem.ai'], ['mem.ai'], 'AI notes', 'Mem', 'unknown', 'medium', ''),
  T('reflect', 'Reflect', [], ['reflect.app'], 'AI notes', 'Reflect', 'unknown', 'low', ''),
  T('obsidian-ai', 'Obsidian (AI plugins)', [], ['obsidian.md'], 'Notes AI plugins', 'Community', 'unknown', 'medium', 'Community plugins send vault content to arbitrary APIs.'),
  T('chatpdf', 'ChatPDF', [], ['chatpdf.com'], 'Document Q&A', 'ChatPDF', 'unknown', 'high', 'Whole documents uploaded to a small vendor — classic shadow-AI leak.'),
  T('humata', 'Humata', [], ['humata.ai'], 'Document Q&A', 'Humata', 'unknown', 'high', ''),
  T('askyourpdf', 'AskYourPDF', [], ['askyourpdf.com'], 'Document Q&A', 'AskYourPDF', 'unknown', 'high', ''),
  T('consensus', 'Consensus', [], ['consensus.app'], 'Research AI', 'Consensus', 'unknown', 'low', ''),
  T('elicit', 'Elicit', [], ['elicit.com', 'elicit.org'], 'Research AI', 'Elicit', 'unknown', 'low', ''),
  T('scite', 'Scite', [], ['scite.ai'], 'Research AI', 'Scite', 'unknown', 'low', ''),
  T('napkin', 'Napkin AI', [], ['napkin.ai'], 'Diagram AI', 'Napkin', 'unknown', 'low', ''),
  T('v0', 'v0', ['v0 vercel'], ['v0.dev'], 'UI generation', 'Vercel', 'configurable', 'medium', ''),
  T('lovable', 'Lovable', [], ['lovable.dev'], 'App generation', 'Lovable', 'unknown', 'medium', ''),
  T('bolt-new', 'Bolt.new', ['bolt'], ['bolt.new'], 'App generation', 'StackBlitz', 'unknown', 'medium', ''),
  T('replit-ai', 'Replit AI', ['ghostwriter'], ['replit.com'], 'Code assistant', 'Replit', 'configurable', 'medium', ''),
];

// ─── Matching ────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/\b(inc|llc|ltd|gmbh|app|the)\b/g, '').replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length]![b.length]!;
}

/**
 * Match a raw imported name (app name, domain, or expense merchant) against
 * the catalog. Order: domain containment → exact name/alias → fuzzy (≤2 edits).
 */
export function matchCatalog(raw: string): CatalogEntry | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  // domain match — raw may be a URL or bare domain
  const domainish = trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]!;
  for (const e of AI_TOOL_CATALOG) {
    if (e.domains.some((d) => domainish === d || domainish.endsWith(`.${d.split('/')[0]}`) || d.startsWith(domainish))) return e;
  }
  const n = norm(trimmed);
  if (!n) return null;
  for (const e of AI_TOOL_CATALOG) {
    if (norm(e.name) === n || e.aliases.some((a) => norm(a) === n)) return e;
  }
  // containment (e.g. "ChatGPT Plus subscription" in an expense line)
  for (const e of AI_TOOL_CATALOG) {
    const en = norm(e.name);
    if (en.length >= 4 && n.includes(en)) return e;
    if (e.aliases.some((a) => { const an = norm(a); return an.length >= 4 && n.includes(an); })) return e;
  }
  // fuzzy
  for (const e of AI_TOOL_CATALOG) {
    if (levenshtein(norm(e.name), n) <= 2) return e;
  }
  return null;
}

export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return AI_TOOL_CATALOG.find((e) => e.id === id);
}
