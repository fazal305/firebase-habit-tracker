# Firebase Habit Tracker

A cloud-synced habit tracker built with Firebase Authentication, Firestore, HTML, CSS, and vanilla JavaScript.

Firebase Habit Tracker lets users create an account, add habits, mark daily completions, track current streaks, review weekly progress, and keep their data synced per user through Firestore.

## Live Demo

https://fazal305.github.io/firebase-habit-tracker/

## Features

- Email and password authentication with Firebase Auth
- Per-user habit storage in Cloud Firestore
- Add, edit, and delete habits
- Mark habits complete or incomplete for today
- Current streak calculation
- Weekly completion overview
- Perfect-days-this-week stat
- Real-time dashboard updates with Firestore listeners
- Responsive dark interface
- Inline form validation and Firebase error messages
- No build step or framework required

## Firebase Notice

This project uses client-side Firebase configuration, which is normal for Firebase web apps. Security should be enforced with Firebase Authentication and Firestore Security Rules.

For a production project, review:

- Enabled auth providers
- Firestore read/write rules
- Allowed domains in Firebase Authentication settings
- Quotas and billing alerts

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Firebase Authentication
- Cloud Firestore
- Firebase Web SDK

## Project Structure

```text
firebase-habit-tracker/
|-- index.html
|-- habit-styles.css
|-- habit-auth.js
|-- habit-db.js
|-- habit-app.js
|-- LICENSE
`-- README.md
```

## What I Practiced

- Firebase Authentication flow
- Firestore subcollections per user
- Real-time listeners with `onSnapshot`
- CRUD operations against Firestore
- Dashboard state management
- Streak and weekly progress calculations
- Form validation and error handling
- Building an authenticated app without a framework

## Run Locally

Open `index.html` in a browser.

An internet connection is required because the Firebase SDK is loaded from Google's CDN.

## Author

Built by Fazal Abbas.

- GitHub: https://github.com/fazal305
- LinkedIn: https://www.linkedin.com/in/fazal-abbas-4653dg86

## License

This project is licensed under the MIT License.
