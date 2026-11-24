
## CwaAX production authentication and database

CwaAX now uses server-side MySQL persistence for email/password accounts, wallet balances, deposits, withdrawals, transactions and admin authorization. The client does not own balances or approval state.

### Environment

Set at minimum:

- `DATABASE_URL`
- `JWT_SECRET` (long random secret)
- `EXPO_PUBLIC_API_BASE_URL` for the deployed API
- `VITE_APP_ID` / OAuth variables only if the optional OAuth flow is retained

### First admin account

Set these server-side environment variables:

- `ADMIN_EMAIL`
- `ADMIN_USERNAME`
- `ADMIN_NAME`
- `ADMIN_PASSWORD`

Then run:

```bash
npm run db:push
npm run db:seed-admin
npm run build
npm start
```

The admin account is stored in the same database as every other user. Logging in from another phone/browser reads the same database, so the admin can see users created on other devices. Admin approval endpoints are protected on the server; changing the UI cannot bypass them.
