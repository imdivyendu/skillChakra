# SkillChakra

SkillChakra is an Express, MongoDB, and Passport.js prototype connecting students, colleges, and companies.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env`.

3. Set `MONGODB_URI` in `.env` to a local MongoDB instance or a MongoDB Atlas connection string. Set a long random `SESSION_SECRET` too.

4. Start the app:

   ```bash
   npm start
   ```

Open `http://localhost:3000`.

## Authentication

- `POST /api/auth/signup` creates a student, college admin, or company account.
- `POST /api/auth/login` signs in with Passport Local and creates a session.
- `POST /api/auth/logout` ends the session.
- `GET /api/auth/session` returns the current session user.

Both login and signup return a clear `503` response when MongoDB is not connected instead of hanging. The browser displays that response in the auth form.
