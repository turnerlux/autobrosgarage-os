# Start here

A plain-English guide to getting Auto Bros OS running. No prior setup assumed.

**The short version:** the app is already built — it just needs a database to talk to. Most of
the "it's getting hung up" feeling comes from running it with nothing behind it. Once a database
is connected, the check-in flow, customer lookup, and job board all work.

---

## Part 1 — Run it on your own computer (about 15 minutes)

You only do this once. After that, starting it up is one command.

### What you need first

| Thing       | Why                           | Where                                        |
| ----------- | ----------------------------- | -------------------------------------------- |
| Node.js 24+ | Runs the app                  | <https://nodejs.org> — pick the LTS download |
| pnpm        | Installs the app's parts      | After Node: `npm install -g pnpm`            |
| PostgreSQL  | The database everything is in | <https://www.postgresql.org/download/>       |

To check Node worked, open Terminal (Mac) or PowerShell (Windows) and run:

```bash
node --version
```

If it prints something like `v24.x.x`, you're good.

### Step 1 — Get the code and its parts

```bash
git clone https://github.com/turnerlux/autobrosgarage-os.git
cd autobrosgarage-os
pnpm install
```

### Step 2 — Make your settings file

Mac / Linux:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```bash
copy .env.example .env.local
```

Now open `.env.local` in any text editor. You need to fill in one line — `AUTH_SECRET`. It just
needs to be a long random string. Generate one:

```bash
openssl rand -base64 32
```

Paste the result after `AUTH_SECRET=` so the line looks like
`AUTH_SECRET=k3Jd8...` (no quotes, no spaces).

Leave `DATABASE_URL` as it is for now.

### Step 3 — Create the database

If you installed PostgreSQL and it's running, create the database the app expects:

```bash
psql -h 127.0.0.1 -d postgres -c "CREATE ROLE autobros LOGIN PASSWORD 'autobros'"
```

```bash
psql -h 127.0.0.1 -d postgres -c "CREATE DATABASE autobros OWNER autobros"
```

If you'd rather use Docker, `docker compose up -d postgres` does the same thing — but only if
Docker Desktop is actually running.

### Step 4 — Build the tables

```bash
pnpm db:migrate
```

This creates all 15 tables. You should see `migrations applied successfully`.

### Step 5 — Create your staff logins

First, make your roster. Copy the example and edit it:

```bash
cp scripts/staff.example.json scripts/staff.json
```

Open `scripts/staff.json` and put your real people in it. Roles available are `owner`,
`manager`, `service_advisor`, `technician`, and `bookkeeper`:

```json
[
  { "username": "turner", "displayName": "Turner", "role": "owner" },
  { "username": "arthur", "displayName": "Arthur", "role": "manager" },
  { "username": "tuan", "displayName": "Tuan", "role": "technician" }
]
```

This file is deliberately **not** saved to GitHub, so your staff's names and usernames stay
private. Then run:

```bash
pnpm staff:bootstrap
```

**It prints each person's password once and never again.** Copy them somewhere safe right now —
a password manager, not a text file. Re-running the command will not reset anyone's password.

### Step 6 — Start it

```bash
pnpm dev
```

Open <http://localhost:3000>. Sign in at **Staff sign in** with the owner username and the
password from Step 5.

### Try it

1. Click **Check in a vehicle**. Fill in a customer, a vehicle, and what's wrong. Save.
2. You get a real job number like `AB-2026-000001`.
3. Click **Job board** — your job is there.
4. Start another check-in and type the same customer's name. It fills them in, **and shows the
   vehicle you just checked in** so you don't retype the VIN.

That's the loop working end to end.

### To stop it

Press `Ctrl` + `C` in the terminal. To start again later, just `pnpm dev`.

---

## Part 2 — Put it on the internet

Right now it only runs on your computer. To use it in the shop, on phones, it needs a host.

**Squarespace cannot do this.** Squarespace builds websites — pages of text and images. This app
is a program that runs on a server and talks to a database. There is no Squarespace setting that
makes that possible; it's the wrong kind of product for the job. Keep the domain there if you
like, but the app has to live somewhere else.

You need two free things:

### The database — Neon

1. Sign up at <https://neon.tech>.
2. Create a project. It gives you a **connection string** that starts with `postgresql://`.
3. Copy it. That's your production `DATABASE_URL`.

### The app — Vercel

Vercel is made by the same people as Next.js, which is what this app is written in.

1. Sign up at <https://vercel.com> with your GitHub account.
2. **Add New → Project**, and pick the `autobrosgarage-os` repository.
3. Before deploying, open **Environment Variables** and add:
   - `DATABASE_URL` — the Neon string from above
   - `AUTH_SECRET` — a **new** random string (`openssl rand -base64 32`), not the local one
   - `APP_ENV` — `production`
   - `APP_ORIGIN` — your site's address, e.g. `https://autobrosgarage.com`
4. Deploy.

Then create the tables on the live database. From your computer, with the Neon string:

```bash
DATABASE_URL="your-neon-string-here" pnpm db:migrate
```

```bash
DATABASE_URL="your-neon-string-here" pnpm staff:bootstrap
```

### The domain

In Vercel, go to your project → **Domains** → add your domain. Vercel shows you a DNS record.
Add that record wherever your domain is managed (Squarespace, for now). It takes a few minutes.

> Your domain is registered through Squarespace because Google Domains was sold to Squarespace,
> so the Google Workspace signup flow lands there. At around $12/month it's roughly 6–10× the
> normal price. Moving it to Cloudflare or Porkbun (~$12 **per year**) is worth doing, but a
> newly registered domain can't be transferred for 60 days. Not urgent — it works as-is.

---

## Part 3 — Turn on the AI features

The AI parts of the app — the command bar, drafted summaries — are built but not connected. See
**[docs/ai-provider.md](docs/ai-provider.md)** for how to connect one and what it costs.

The one-line version: **a ChatGPT or Claude subscription will not work for this.** Those are
logins for a person to use a chat website. Your app needs an **API key**, which is a different
product, billed per use. Realistically $10–30/month for a shop your size.

---

## Everyday commands

| Command                | What it does                                         |
| ---------------------- | ---------------------------------------------------- |
| `pnpm dev`             | Start the app on your computer                       |
| `pnpm check`           | Verify everything still works before committing      |
| `pnpm db:migrate`      | Apply database changes after pulling new code        |
| `pnpm staff:bootstrap` | Add logins for new staff (won't touch existing ones) |

---

## When something goes wrong

**"Waiting for database connection" on the home page, or check-in won't save.**
The database isn't reachable. Check that PostgreSQL is running and that `DATABASE_URL` in
`.env.local` matches what you created in Step 3.

**`pnpm dev` says port 3000 is in use.**
The app is already running in another terminal window. Either use that one, or look at the
address it prints — it will pick a different port.

**Someone forgot their password.**
There's no reset flow yet. For now, delete their row from `app.user_credentials` and re-run
`pnpm staff:bootstrap` to issue a new one.

**"No staff roster found."**
You skipped Step 5. Copy `scripts/staff.example.json` to `scripts/staff.json` first.

**Something broke after pulling new code.**
Run `pnpm install` then `pnpm db:migrate` — new code often needs new parts and new tables.

---

## Before real customers use this

Three things are worth doing before anyone's actual phone number goes in the database. They're
listed in `BACKLOG.md` under Phase 15, and none is large:

1. **Turn on MFA** for the owner and manager logins.
2. **Fix login lockout.** It currently locks by username, so five wrong guesses locks that person
   out for 15 minutes — meaning anyone who knows a username can lock your staff out on purpose.
3. **Test a backup restore.** Not "set up backups" — actually restore one and confirm it worked.

If you plan to sell this to used car lots, these stop being your inconvenience and start being
your liability for someone else's customer data.
