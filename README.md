# 🎁 KinList

> A shared family space for gift ideas, budgets and Secret Santa. **Surprise-safe.**

KinList is an open-source, hosted-friendly platform that kills holiday gift stress.
Add the people you buy for, jot down gift ideas, mark what you've bought — and the
recipient **never** sees it coming.

![KinList](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Postgres](https://img.shields.io/badge/Postgres-16-blue?logo=postgresql)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

- **👨‍👩‍👧 Shared family spaces** — invite your partner, kids, siblings, in-laws.
- **🎯 Surprise-safe gifting** — claim or buy a gift and it's hidden from the recipient.
  Everyone else still sees it, so nobody double-buys.
- **👤 People profiles** — birthday, relation, **likes** & **dislikes**, notes, photo.
- **🎉 Occasions** — "Christmas 2026", "Mom's Birthday" with per-person budgets and a
  progress bar.
- **🤖 Gift ideas** — built-in heuristic suggester (free, offline) + optional AI
  (any OpenAI-compatible API). One click to add an idea to the list.
- **🎅 Secret Santa** — join, draw (derangement: nobody draws themselves), set a
  wishlist that only your giver sees.
- **🎁 Gift history** — see past gifts per person so you never repeat yourself.
- **📸 Photo uploads** — for people and gift ideas (Vercel Blob in prod, local in dev).
- **🔐 Auth** — email + password via [Better Auth](https://better-auth.com).

## 🧠 The surprise rule

A gift goes through three states:

| State | Who sees it |
|-------|-------------|
| **idea** | Everyone in the family |
| **claimed** ("I'll get this") | Everyone **except** the recipient — and the recipient doesn't see the claimer |
| **bought** | Everyone **except** the recipient — purchaser hidden from recipient |

If a `Person` is **linked** to a real user account ("this is me"), that user is treated
as the recipient everywhere: they only see `idea` gifts with purchaser info stripped,
and they **cannot** claim/purchase gifts for themselves.

## 🚀 Quick start

```bash
# 1. Postgres (Docker)
docker run -d --name kinlist-postgres \
  -e POSTGRES_USER=kinlist -e POSTGRES_PASSWORD=kinlist_dev -e POSTGRES_DB=kinlist \
  -p 5432:5432 -v kinlist-pgdata:/var/lib/postgresql/data postgres:16-alpine

# 2. Install & env
cp .env.example .env   # or use the committed dev .env
npm install

# 3. Database
npm run db:push        # push schema (dev)
# npm run db:migrate   # or create a migration (prod)

# 4. Seed demo data
npm run db:seed

# 5. Run
npm run dev
```

Open http://localhost:3000 — or log in with the seeded demo account:

```
email:    demo@kinlist.app
password: password123
```

## 🗄️ Data model

```
User ──┬── FamilyMember ── Family ──┬── Person ─────┬── Gift ── Occasion
       │                            │   │          └── PersonOccasion ── Occasion
       │                            ├── Occasion
       │                            └── SantaEvent ─┬─ SantaParticipant
       ├── Gift (as purchaser)                     └─ SantaAssignment (giver→receiver)
       ├── Occasion (as creator)
       ├── FamilyInvite (as sender)
       ├── SantaAssignment (as giver / receiver)
       └── Person (linkedUser — "this is me")
```

See [`prisma/schema.prisma`](prisma/schema.prisma) for the full schema.

## 🤖 AI gift suggestions

KinList ships with a **free, offline heuristic suggester** (rule-based, uses the
person's likes/dislikes + budget). To enable real AI:

```env
AI_API_URL="https://api.openai.com/v1/chat/completions"
AI_API_KEY="sk-..."
AI_MODEL="gpt-4o-mini"
```

Any OpenAI-compatible chat-completions endpoint works (OpenAI, OpenRouter, Groq,
Ollama, etc.). The endpoint is `/api/suggest` (POST `{ personId, occasionId?, count? }`).

## 🧪 Scripts

| Command | What |
|---------|------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to DB (dev) |
| `npm run db:migrate` | Create & run migrations |
| `npm run db:seed` | Seed demo family |
| `npm run db:studio` | Open Prisma Studio |

## 🛣️ Roadmap

- [ ] Email invites via Resend (currently returns a shareable link)
- [ ] Wishlist import from a URL (Amazon/any shop)
- [ ] Push/email reminders before birthdays
- [ ] Mobile PWA
- [ ] "Group gift" (multiple people chip in)
- [ ] Price tracking / drop alerts
- [ ] Multi-family budgets rollup

## 📄 License

MIT — see [LICENSE](LICENSE).
