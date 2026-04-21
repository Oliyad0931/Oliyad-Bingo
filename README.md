# Firebase backend scaffold for Oliyad-Bingo

This branch adds a Firebase backend scaffold (Firestore + Cloud Functions + client init) with placeholders. Follow these steps locally to finish setup and deploy:

1. Install Firebase CLI:
   npm install -g firebase-tools
2. Login and select project:
   firebase login
   cd <repo>
   firebase use --add
   (select the `oliyad-bingo` project or enter its project id)
3. Install functions dependencies and deploy:
   cd functions
   npm install
   cd ..
   firebase deploy --only firestore,functions,hosting

To test locally use the Firebase emulators:
   firebase emulators:start

Do NOT commit service account JSON to the repo. For CI/CD deploy, create a service account json and add it as a GitHub Actions secret (not included in this branch).