# Book Club — deploy guide

This is a real, deployable version of the prototype: a Vite + React frontend,
Supabase as the database and file storage, and Netlify serverless functions
handling anything that touches guardian emails, security answers, or
catalogue writes.

## Why it's split this way

- **`books` table (read)** — not sensitive, so the browser reads it directly
  with Supabase's public "anon" key.
- **`books` table (write) and file uploads** — gated behind an admin
  password, checked server-side on every write. The anon key has no insert
  permission on this table at all; writes only happen through the Netlify
  functions using the private service-role key.
- **`registrations` table** — contains guardian emails and security-answer
  hashes. Row-level security blocks the anon key from touching it entirely.
  The only way in is through the Netlify functions, same as above.

## 1. Set up Supabase

1. Create a project at supabase.com (or use your existing one).
2. Go to **SQL Editor → New query**, paste in the contents of
   `supabase/schema.sql`, and run it. This creates both tables with the
   correct security rules.
3. Go to **Storage → New bucket**, name it exactly `book-files`, and leave
   **Public bucket** OFF. Files are only ever reached through short-lived
   signed URLs issued to logged-in members — nothing in this bucket should
   be permanently public.
4. Go to **Project Settings → API** and copy three values:
   - **Project URL**
   - **anon / public key**
   - **service_role key** (keep this one secret — never put it in frontend code)

## 2. Push this to GitHub

From this folder:

```bash
git init
git add .
git commit -m "Initial book club app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

(`node_modules`, `dist`, and `.env` are already excluded via `.gitignore`.)

## 3. Connect it to Netlify

1. In Netlify: **Add new site → Import an existing project → GitHub**, pick
   this repo.
2. Build settings should auto-fill from `netlify.toml`
   (build command `npm run build`, publish directory `dist`) — leave them.
3. Before the first deploy, go to **Site settings → Environment variables**
   and add:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
   | `SUPABASE_URL` | same Project URL again (functions read `process.env`, not Vite's env) |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role key |
   | `ADMIN_PASSWORD` | a password of your choosing — this gates "Add a book" and file uploads |

4. Deploy. Netlify gives you a live URL immediately
   (something like `yoursite.netlify.app`) — that's the real, public link.

## 4. Test it live

Same script as before, just for real this time:
register → unlock admin on the Catalogue's "Add a book" tab → add a book
(try actually uploading a small file) → log in → confirm the catalogue shows
up from the login screen → try "Forgot your login?"

Since no email service is set up yet, the reset code will show directly in
the app instead of being emailed — see below for how to fix that.

## How member-only file access works

Login doesn't just check an answer and forget — a successful login now
issues a random session token (stored in the `sessions` table, valid for 7
days) and hands it back to the browser. Clicking "Open e-book file" or
"Open audiobook file" sends that token to `get-file-url.js`, which checks
it's valid and not expired, then asks Supabase Storage for a signed URL that
expires in 2 minutes. Logging out deletes the session row server-side, not
just the token in the browser's memory.

Logged-out visitors can still browse the catalogue's metadata (titles,
formats, topics) — only the actual files require being logged in.

## How recommendations work

Once logged in, the **For You** tab in Catalogue scores every book in the
collection against that member's profile:

- **Hard filters first** (not scored, just narrow the pool): the book must
  suit the member's age band, be available in at least one of their
  preferred formats, roughly match their length preference, and not contain
  anything from their "skip" list.
- **Then a weighted score** across what's left: top-3 topics (45%),
  reading personality (25%), hobbies (15%), and mood (15%) — the same
  weights from the original spec. Books untagged on personality/hobbies/mood
  get a neutral half-credit rather than being penalized for missing data.
- The top 6 matches show up, each with a rough match percentage.

This is why books can now be tagged with **relevant hobbies** in the add/edit
form — that field didn't exist before and the hobbies weight had nothing to
match against.

## Editing a book

Every book in Browse now has an **Edit** link (admin-gated, same password as
adding). It reuses the add-book form pre-filled with the existing data,
including re-uploading a replacement file if needed. Note: replacing a file
doesn't delete the old one from storage — a small cleanup task if that ever
matters.

## Turning on real reset emails

Reset codes currently just show up in the app instead of being emailed. To
fix that:

1. Sign up at [resend.com](https://resend.com) (free tier).
2. Get an API key from their dashboard.
3. In Netlify, add environment variable `RESEND_API_KEY` with that key.
4. Redeploy.

`forgot-identify.js` already checks for that variable and switches to
sending a real email automatically — no code changes needed.

## Known gaps, in rough priority order

1. **No recommendation calibration yet** — the "admired book/show/person"
   field collected at registration isn't used for anything yet. It's there
   for a future "more like this" boost.
2. **Replaced files aren't cleaned up from storage** when a book is edited.
3. **Sessions don't refresh.** A member's 7-day session just expires outright
   rather than extending itself with use.
4. **No way to request a book that's not in the catalogue** — the original
   spec imagined recommending aspirational titles you don't own yet with a
   "request this" button, but recommendations right now only ever pull from
   what's actually in the catalogue.

## Local development

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

Note: the Netlify functions won't run under plain `npm run dev` — for those,
use the [Netlify CLI](https://docs.netlify.com/cli/get-started/)
(`netlify dev`) instead, which runs the frontend and functions together.

