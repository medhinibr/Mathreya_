# Mathreya

Mathreya is a women's health and maternal-care application covering adolescent health, pregnancy, postnatal care, and partner support. The repository contains a responsive React web application, an Express development/production server, and a separate Flutter/Dart mobile scaffold.

## Engineering Overview

- Implemented a typed, component-based React application with protected navigation and authentication state management.
- Integrated Appwrite account and database operations for email/password authentication, email OTP, password recovery, passkeys, profiles, journals, period logs, appointments, medical records, and related care data.
- Added browser passkey flows using WebAuthn and the Web Crypto API, with feature detection and user-facing error handling.
- Built life-stage views for puberty, prenatal and postnatal care, virtual maternal support, and partner tasks.
- Added an Express API for health checks and chat responses, with Vite middleware in development and static asset serving in production.
- Used browser speech synthesis and vibration capabilities where supported by the device.

## Technology Stack

### Web Client
- React 19 and TypeScript 5.8
- Vite 6 for development and client builds
- Tailwind CSS 4 with the Vite plugin
- Motion 12 for interface transitions
- Lucide React for icons
- Appwrite JavaScript SDK 26 for authentication and database access

### Server and Tooling
- Node.js and Express 4
- Vite middleware for development-time SPA serving
- `tsx` for running the TypeScript server in development
- `dotenv` for server environment configuration
- `esbuild` for bundling the production server
- TypeScript compiler for the project type check

### Browser and Mobile APIs
- WebAuthn and Web Crypto API for passkey operations
- Web Speech API (`SpeechSynthesis`) for spoken prompts
- Vibration API for supported-device haptic feedback
- Flutter and Dart 3 for the separate mobile scaffold in `flutter_project/`

## Application Areas

- **Authentication:** account creation, email/password sign-in, email OTP, password recovery, session handling, and passkey registration/sign-in.
- **Dashboard and profile:** authenticated navigation, profile management, and passkey management.
- **Puberty care:** period and symptom tracking, journal entries, and educational content.
- **Pregnancy care:** prenatal and postnatal guidance, appointment tracking, medical records, and related care data.
- **Virtual maternal support:** conversational interface, text-to-speech prompts, and contextual guidance views.
- **Partner dashboard:** task tracking and partner-focused care information.

## Repository Layout

```text
src/
  auth/          Authentication provider, hooks, and route protection
  components/    Application screens and shared UI
  lib/           Appwrite client and data operations
  utils/         Authentication, haptics, and Flutter-code utilities
flutter_project/ Flutter/Dart mobile scaffold
server.ts        Express server and API routes
```

## Local Development

### Requirements

- Node.js 18 or later
- npm
- An Appwrite project for authentication and database-backed features

### Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create `.env.local` from `.env.example` and set `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID` for your Appwrite project. Configure the required Appwrite authentication methods and database collections in the Appwrite console.

3. Start the development server:

   ```bash
   npm run dev
   ```

   The application is served at `http://localhost:3000`.

### Project Commands

```bash
npm run lint    # TypeScript check
npm run build   # Build the web client and production server bundle
npm start       # Run the production server after building
```

## Configuration and Security

- Keep local credentials in an ignored `.env` or `.env.local` file; do not commit populated environment files.
- `VITE_` variables are embedded in the browser bundle. Use them only for public client configuration such as the Appwrite endpoint and project ID, never for server API secrets.
- Store server-side secrets in the deployment platform's secret manager and access them only from server code.

## Implementation Notes

- The `/api/ai/chat` route currently returns deterministic sample responses; a Gemini API integration is not wired into the current runtime.
- `flutter_project/` is a separate scaffold and does not currently provide feature parity with the web application.
- This project is a software prototype, not a medical device or substitute for professional medical advice.
