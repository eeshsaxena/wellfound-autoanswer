# Wellfound Auto-Answer (Ollama)

A single Tampermonkey userscript that drafts answers to the "additional questions" on
Wellfound job applications using a **local, free** Ollama model. It fills the answers into
the form fields **for you to review and edit** — it never submits on your behalf.

## Why not an MCP server?

An MCP server can't fill a form by itself; it only works when an AI agent is actively driving
your browser each time. A userscript lives right on the Wellfound page and talks straight to
Ollama, so it's zero-friction and fully free. No API keys, no cloud, no per-answer cost.

## Setup (one time)

**Install Tampermonkey** (Chrome/Edge/Firefox extension), then open
`wellfound-autoanswer.user.js` — Tampermonkey will offer to install it. (Enable
Developer Mode in the extension if it asks.)

Then pick a provider in the panel:

### Option A — Ollama (local, free)
1. Install Ollama — https://ollama.com/download — then pull a model:
   ```bash
   ollama pull llama3.1
   ```
2. Let the browser reach Ollama. The script calls `localhost:11434` from wellfound.com,
   so Ollama must allow that origin. On Windows (PowerShell):
   ```powershell
   setx OLLAMA_ORIGINS "*"
   ```
   Then fully quit Ollama (system tray → Quit) and start it again.
3. In the panel: Provider = **Ollama**, Model = `llama3.1`.

### Option B — Gemini (free API key, no local install)
1. Get a free key at https://aistudio.google.com/app/apikey (no billing required).
2. In the panel: Provider = **Gemini**, Model = `gemini-3.6-flash`, paste your key
   (starts with `AIza...`), Save.

### Option C — OpenAI (paid API key, no local install)
1. Get a key at https://platform.openai.com/api-keys (requires billing).
2. In the panel: Provider = **OpenAI**, Model = `gpt-4o-mini` (cheap) or `gpt-4o`, paste your key.

> Any API key you paste is stored **locally in your browser** (`GM_setValue`) and is
> **never committed to this repo** — it's typed into the panel, not the code. The key is
> sent in a request header, never in a URL.
>
> Note: a cloud provider (Gemini/OpenAI) just removes the need to run Ollama locally. It does
> **not** let the script run while your computer is off — the script only runs in your
> browser on the Wellfound page.

## Use

1. Open any Wellfound application. A **✦ Auto-Answer** button sits in the bottom-right.
2. First run: click it, paste your **resume / background**, set the model name (`llama3.1`),
   and Save.
3. Click **✦ Draft all answers** — every question field gets a tailored first-person draft.
   Or use the small **✦ draft** chip on an individual field.
4. **Review, edit, then hit Wellfound's own Submit.** You always send it yourself.

### Hands-off mode

Tick **"Auto-draft as soon as an application page opens"** in settings. Then it drafts
automatically — no button press — the instant question boxes appear, including Wellfound's
in-place apply pop-ups and multi-step forms. It only fills **blank** boxes it hasn't already
answered, so it never clobbers your edits or re-runs on a field twice. You just move through
the flow; answers are already written when you get to each step. The final **Submit** is
always yours to click.

### One-key submit

Tick **"One-key submit"** in settings. After the answers fill in, the page's Submit button is
highlighted and scrolled into view, and pressing **Ctrl+Enter** clicks it — so a whole
application becomes: open → answers fill → glance → Ctrl+Enter. It only ever fires on your
deliberate keypress (one per application); it never submits on its own. Keep applications
attended and go one at a time — automated *unattended* mass-submitting violates Wellfound's
terms and risks your account.

## On "run it at a scheduled time"

The script runs *inside your browser on the application page*, so it drafts the instant you
open an application (instantly, hands-off with auto-draft on). It can't log in, hunt for new
postings, and submit applications while you're away — and it deliberately won't auto-submit,
since every application should be yours to review before it's sent. Truly unattended applying
would be a separate headless-browser bot with real account-ban risk; this tool keeps you in
the loop and does the slow part (writing the answers) for you.

## Privacy

Your resume and settings are stored locally by Tampermonkey (`GM_setValue`) and only ever sent
to your own local Ollama. Nothing leaves your machine.
