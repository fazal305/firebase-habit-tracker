/* Returns the habits collection for the logged-in user. */
function getHabitsRef(userId) {
    return db.collection("users").doc(userId).collection("habits");
}

/* Returns the completions collection for the logged-in user. */
function getCompletionsRef(userId) {
    return db.collection("users").doc(userId).collection("completions");
}

/* Loads habits in real time and rerenders whenever Firestore changes. */
function loadHabits(userId, callback) {
    return getHabitsRef(userId)
        .orderBy("createdAt", "desc")
        .onSnapshot(function(snapshot) {
            const habits = [];

            snapshot.forEach(function(doc) {
                habits.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            callback(habits);
        });
}

/* Adds a new habit document to Firestore. */
async function addHabit(userId, habitData) {
    return getHabitsRef(userId).add({
        ...habitData,
        userId: userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/* Updates an existing habit document in Firestore. */
async function updateHabit(userId, habitId, updates) {
    return getHabitsRef(userId).doc(habitId).update(updates);
}

/* Deletes a habit and all completion records connected to it. */
async function deleteHabit(userId, habitId) {
    const completionSnapshot = await getCompletionsRef(userId)
        .where("habitId", "==", habitId)
        .get();

    const batch = db.batch();

    completionSnapshot.forEach(function(doc) {
        batch.delete(doc.ref);
    });

    batch.delete(getHabitsRef(userId).doc(habitId));

    return batch.commit();
}

/* Marks one habit complete for a specific date. */
async function markComplete(userId, habitId, date) {
    const completionId = `${habitId}_${date}`;

    return getCompletionsRef(userId).doc(completionId).set({
        habitId: habitId,
        date: date,
        completedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/* Marks one habit incomplete for a specific date. */
async function markIncomplete(userId, habitId, date) {
    const completionId = `${habitId}_${date}`;

    return getCompletionsRef(userId).doc(completionId).delete();
}

/* Gets completion documents for one habit across the last 7 days. */
async function getCompletionsForWeek(userId, habitId) {
    const weekDates = getLastSevenDates();

    const snapshot = await getCompletionsRef(userId)
        .where("habitId", "==", habitId)
        .where("date", "in", weekDates)
        .get();

    const completions = [];

    snapshot.forEach(function(doc) {
        completions.push({
            id: doc.id,
            ...doc.data()
        });
    });

    return completions;
}

/* Loads all completion records in real time for dashboard stats. */
function loadCompletions(userId, callback) {
    return getCompletionsRef(userId).onSnapshot(function(snapshot) {
        const completions = [];

        snapshot.forEach(function(doc) {
            completions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        callback(completions);
    });
}

/* Creates an array of date strings for today and the previous 6 days. */
function getLastSevenDates() {
    const dates = [];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        const date = new Date();

        date.setDate(date.getDate() - dayOffset);

        dates.push(date.toISOString().split("T")[0]);
    }

    return dates;
}

/* Calculates current streak by checking completed dates backwards from today. */
function calculateStreak(completions) {
    const completedDates = completions.map(function(completion) {
        return completion.date;
    });

    let streak = 0;
    const currentDate = new Date();

    while (true) {
        const dateString = currentDate.toISOString().split("T")[0];

        if (completedDates.includes(dateString)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}