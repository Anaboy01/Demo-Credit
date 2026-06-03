# Demo Credit — Requirements

## Key features

The wallet API must support:

| Feature | Endpoint | Description |
| ------- | -------- | ----------- |
| Create account | `POST /api/auth/register` | Register a user; a wallet is created automatically. Blocked if email or phone is on Adjutor Karma (`403`) or if Karma is unavailable (`503`). |
| Fund account | `POST /api/wallet/fund` | Add money to the authenticated user's wallet (simulated top-up). |
| Transfer funds | `POST /api/wallet/send` | Send money to another user by phone number. |
| Withdraw funds | `POST /api/wallet/withdraw` | Withdraw to UBA, OPay, or PalmPay with a valid 10-digit NUBAN. |
| Karma blacklist | Registration flow | Users with records on the Lendsqr Adjutor Karma blacklist must never be onboarded. |

**Auth:** Protected wallet routes require `Authorization: Bearer <token>` from login.

**Also available:** balance, transaction history, eligible banks list, health check.

---

## Server

| Item | Detail |
| ---- | ------ |
| Live URL | `https://ibrahim-anate-lendsqr-be-test.onrender.com` |
| Health check | `GET /health` |
| Stack | Node.js, TypeScript, Express, Knex, MySQL |
| Hosting | Render (`render.yaml`) |

**Quick test:** run `./smoke.sh` against the live URL to exercise register → login → fund → send → transactions.

---

## Loom video

| Requirement | Detail |
| ----------- | ------ |
| Platform | Loom only |
| Length | Max 3 minutes |
| Face | Must be visible the entire video, including during screen share |
| Content | Review what the assessment asked for vs what was built; say whether they match (and note any gaps) |
| Demo | Short walkthrough of the live server is recommended |

**Suggested flow:** intro → checklist of five features → live demo on deployed API → brief note on Karma + transactions → close with server URL and repo link.
