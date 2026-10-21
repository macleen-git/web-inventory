# Hardware React Firebase

## Run the project

1. Open this folder in VS Code.
2. Open the terminal in the project folder.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the Vite address shown in the terminal.

## Login and roles

Firebase Authentication handles email/password and Google login.

Each authenticated user has a Firestore document in `users` using the Firebase Auth UID as the document ID.

New accounts are created with:

`role: user`

An administrator must have:

`role: admin`

After changing a user's role to `admin` in Firestore, logging in with that account sends the user to `/admin`.

Normal users are sent to `/dashboard`.

## Firestore

The project includes `firestore.rules`. Publish these rules in the Firebase console or with the Firebase CLI.

Make sure Firebase Authentication has Email/Password enabled. Enable Google sign-in if you want the Google button to work.

For Google sign-in, add your development domain such as `localhost` to Firebase Authentication authorized domains.

## Important

The Firebase web configuration in `src/components/firebase.js` belongs to the Firebase web application. It is normal for Firebase web configuration values to be present in frontend code. Access control must be enforced with Firebase Authentication and Firestore Security Rules.
