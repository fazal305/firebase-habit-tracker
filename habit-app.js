const appState = {
    currentUser: null,
    habits: [],
    completions: [],
    habitUnsubscribe: null,
    completionUnsubscribe: null
};

let habitModal;

/* Starts the app and watches Firebase login state. */
function init() {
    habitModal = new bootstrap.Modal(document.getElementById("habit-modal"));

    watchAuthState(function(user) {
        appState.currentUser = user;

        if (user) {
            renderDashboard(user);
            startRealtimeListeners(user.uid);
        } else {
            stopRealtimeListeners();
            renderAuthScreen("signin");
        }
    });
}

/* Renders the sign in or sign up screen. */
function renderAuthScreen(mode) {
    const isSignUp = mode === "signup";

    $("#app-root").html(`
        <main class="auth-page">
            <section class="auth-card">
                <span class="auth-badge">Firebase Auth</span>

                <h1>${isSignUp ? "Create Account" : "Welcome Back"}</h1>

                <p>
                    ${isSignUp
                        ? "Create your account and start tracking habits in the cloud."
                        : "Sign in to continue your habit streaks."}
                </p>

                <form id="${isSignUp ? "signup-form" : "signin-form"}">
                    <div class="mb-3">
                        <label class="form-label" for="auth-email">Email</label>
                        <input class="form-control" id="auth-email" type="email" placeholder="you@example.com">
                        <div class="form-error" id="auth-email-error"></div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label" for="auth-password">Password</label>
                        <input class="form-control" id="auth-password" type="password" placeholder="Minimum 6 characters">
                        <div class="form-error" id="auth-password-error"></div>
                    </div>

                    ${isSignUp ? `
                        <div class="mb-3">
                            <label class="form-label" for="auth-confirm-password">Confirm Password</label>
                            <input class="form-control" id="auth-confirm-password" type="password" placeholder="Repeat password">
                            <div class="form-error" id="auth-confirm-error"></div>
                        </div>
                    ` : ""}

                    <div class="form-error" id="auth-form-error"></div>

                    <button class="btn btn-neon w-100" id="auth-submit-btn" type="submit">
                        ${isSignUp ? "Sign Up" : "Sign In"}
                    </button>
                </form>

                <div class="auth-switch">
                    ${isSignUp ? "Already have an account?" : "Don't have an account?"}
                    <button type="button" id="switch-auth-btn" data-mode="${isSignUp ? "signin" : "signup"}">
                        ${isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                </div>
            </section>
        </main>
    `);
}

/* Starts Firestore real-time listeners for habits and completions. */
function startRealtimeListeners(userId) {
    stopRealtimeListeners();

    appState.habitUnsubscribe = loadHabits(userId, function(habits) {
        appState.habits = habits;
        renderDashboard(appState.currentUser);
    });

    appState.completionUnsubscribe = loadCompletions(userId, function(completions) {
        appState.completions = completions;
        renderDashboard(appState.currentUser);
    });
}

/* Stops active Firestore listeners when user logs out. */
function stopRealtimeListeners() {
    if (appState.habitUnsubscribe) {
        appState.habitUnsubscribe();
        appState.habitUnsubscribe = null;
    }

    if (appState.completionUnsubscribe) {
        appState.completionUnsubscribe();
        appState.completionUnsubscribe = null;
    }

    appState.habits = [];
    appState.completions = [];
}

/* Renders the full logged-in dashboard. */
function renderDashboard(user) {
    if (!user) {
        return;
    }

    const todayText = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    $("#app-root").html(`
        <main class="dashboard-shell">
            <header class="app-header">
                <div>
                    <h1 class="brand-title">Firebase Habit Tracker</h1>
                    <div class="user-email">${user.email}</div>
                </div>

                <button class="btn btn-outline-light" id="signout-btn">Sign Out</button>
            </header>

            <section class="date-card">
                <span>Today</span>
                <h2>${todayText}</h2>
            </section>

            <section class="row g-3 mb-4">
                ${renderStats()}
            </section>

            <section class="row g-3">
                ${renderHabitCards()}
            </section>

            ${renderWeeklyOverview()}

            <button class="floating-add-btn" id="open-add-habit-btn" aria-label="Add habit">+</button>
        </main>
    `);
}

/* Renders dashboard stat cards. */
function renderStats() {
    const totalHabits = appState.habits.length;
    const weekDates = getLastSevenDates();
    const longestCurrentStreak = getLongestCurrentStreak();
    const perfectDays = getPerfectDaysThisWeek(weekDates);

    return `
        <div class="col-md-4">
            <article class="stat-card">
                <p>Total Habits</p>
                <strong>${totalHabits}</strong>
            </article>
        </div>

        <div class="col-md-4">
            <article class="stat-card">
                <p>Perfect Days This Week</p>
                <strong>${perfectDays}</strong>
            </article>
        </div>

        <div class="col-md-4">
            <article class="stat-card">
                <p>Longest Current Streak</p>
                <strong>${longestCurrentStreak}</strong>
            </article>
        </div>
    `;
}

/* Renders all habit cards for today. */
function renderHabitCards() {
    if (appState.habits.length === 0) {
        return `
            <div class="col-12">
                <section class="empty-state">
                    <h2>No habits yet</h2>
                    <p>Create your first habit and start building a real streak.</p>
                    <button class="btn btn-neon" id="empty-create-btn">+ Create Your First Habit</button>
                </section>
            </div>
        `;
    }

    return appState.habits.map(function(habit) {
        const today = getTodayString();
        const isCompleted = isHabitCompletedOnDate(habit.id, today);
        const weekCount = getWeeklyCompletionCount(habit.id);
        const completionPercent = Math.round((weekCount / 7) * 100);
        const habitCompletions = getCompletionsForHabit(habit.id);
        const currentStreak = calculateStreak(habitCompletions);

        return `
            <div class="col-md-6 col-xl-4">
                <article class="habit-card" style="border-left-color: ${habit.color};">
                    <div class="habit-top">
                        <div>
                            <div class="habit-emoji">${habit.emoji}</div>
                            <h3 class="habit-name">${habit.name}</h3>
                            <div class="habit-frequency">${habit.frequency}</div>
                        </div>

                        <button class="complete-btn ${isCompleted ? "completed" : ""}" data-id="${habit.id}">
                            ${isCompleted ? "✔" : ""}
                        </button>
                    </div>

                    <div class="streak-badge">🔥 ${currentStreak} day streak</div>

                    <p class="mb-2 text-secondary">This week: ${weekCount}/7 days</p>

                    <div class="progress">
                        <div class="progress-bar" style="width: ${completionPercent}%"></div>
                    </div>

                    <div class="habit-actions">
                        <button class="btn btn-sm btn-outline-light edit-habit-btn" data-id="${habit.id}">Edit</button>
                        <button class="btn btn-sm btn-outline-danger delete-habit-btn" data-id="${habit.id}">Delete</button>
                    </div>
                </article>
            </div>
        `;
    }).join("");
}

/* Renders the weekly completion overview. */
function renderWeeklyOverview() {
    if (appState.habits.length === 0) {
        return "";
    }

    const weekDates = getLastSevenDates();

    const rows = appState.habits.map(function(habit) {
        const dots = weekDates.map(function(date) {
            const dotClass = isHabitCompletedOnDate(habit.id, date) ? "complete" : "";

            return `<span class="week-dot ${dotClass}" title="${date}"></span>`;
        }).join("");

        return `
            <div class="week-row">
                <div class="week-habit-name">${habit.emoji} ${habit.name}</div>
                ${dots}
            </div>
        `;
    }).join("");

    return `
        <section class="weekly-panel">
            <h2 class="mb-3">Weekly Overview</h2>

            <div class="week-row text-secondary">
                <div>Habit</div>
                ${weekDates.map(function(date) {
                    return `<div class="text-center">${date.slice(5)}</div>`;
                }).join("")}
            </div>

            ${rows}
        </section>
    `;
}

/* Opens the habit modal for adding a new habit. */
function openAddHabitModal() {
    $("#habit-modal-title").text("Add Habit");
    $("#habit-id").val("");
    $("#habit-name").val("");
    $("#habit-emoji").val("💧");
    $("#habit-frequency").val("daily");
    $("#habit-color").val("#00f5ff");

    $(".emoji-option").removeClass("active");
    $('.emoji-option[data-emoji="💧"]').addClass("active");

    clearErrors();
    habitModal.show();
}

/* Opens the habit modal for editing an existing habit. */
function openEditHabitModal(habitId) {
    const habit = appState.habits.find(function(item) {
        return item.id === habitId;
    });

    if (!habit) {
        return;
    }

    $("#habit-modal-title").text("Edit Habit");
    $("#habit-id").val(habit.id);
    $("#habit-name").val(habit.name);
    $("#habit-emoji").val(habit.emoji);
    $("#habit-frequency").val(habit.frequency);
    $("#habit-color").val(habit.color);

    $(".emoji-option").removeClass("active");
    $(`.emoji-option[data-emoji="${habit.emoji}"]`).addClass("active");

    clearErrors();
    habitModal.show();
}

/* Handles adding or updating a habit from the modal form. */
async function handleHabitFormSubmit(event) {
    event.preventDefault();

    clearErrors();

    const habitId = $("#habit-id").val();
    const habitName = $("#habit-name").val().trim();
    const habitEmoji = $("#habit-emoji").val();
    const habitFrequency = $("#habit-frequency").val();
    const habitColor = $("#habit-color").val();

    if (!habitName) {
        showError("habit-name-error", "Habit name is required.");
        return;
    }

    const habitData = {
        name: habitName,
        emoji: habitEmoji,
        frequency: habitFrequency,
        color: habitColor
    };

    try {
        if (habitId) {
            await updateHabit(appState.currentUser.uid, habitId, habitData);
        } else {
            await addHabit(appState.currentUser.uid, habitData);
        }

        habitModal.hide();
    } catch (error) {
        showError("habit-form-error", "Could not save habit. Check Firebase rules.");
    }
}

/* Handles completing or uncompleting a habit for today. */
async function handleToggleComplete(habitId) {
    const today = getTodayString();
    const isCompleted = isHabitCompletedOnDate(habitId, today);

    try {
        if (isCompleted) {
            await markIncomplete(appState.currentUser.uid, habitId, today);
        } else {
            await markComplete(appState.currentUser.uid, habitId, today);
        }
    } catch (error) {
        console.error(error);
    }
}

/* Handles deleting a habit after confirmation. */
async function handleDeleteHabit(habitId) {
    const confirmed = confirm("Delete this habit and its completion history?");

    if (!confirmed) {
        return;
    }

    try {
        await deleteHabit(appState.currentUser.uid, habitId);
    } catch (error) {
        console.error(error);
    }
}

/* Handles sign in form submission. */
async function handleSignIn(event) {
    event.preventDefault();

    clearErrors();

    const email = $("#auth-email").val().trim();
    const password = $("#auth-password").val();

    const result = await signIn(email, password);

    if (!result.success) {
        showError("auth-form-error", result.message);
    }
}

/* Handles sign up form submission. */
async function handleSignUp(event) {
    event.preventDefault();

    clearErrors();

    const email = $("#auth-email").val().trim();
    const password = $("#auth-password").val();
    const confirmPassword = $("#auth-confirm-password").val();

    if (password !== confirmPassword) {
        showError("auth-confirm-error", "Passwords do not match.");
        return;
    }

    const result = await signUp(email, password);

    if (!result.success) {
        showError("auth-form-error", result.message);
    }
}

/* Returns today as YYYY-MM-DD. */
function getTodayString() {
    return new Date().toISOString().split("T")[0];
}

/* Checks if a habit is completed on a specific date. */
function isHabitCompletedOnDate(habitId, date) {
    return appState.completions.some(function(completion) {
        return completion.habitId === habitId && completion.date === date;
    });
}

/* Returns all completions for one habit. */
function getCompletionsForHabit(habitId) {
    return appState.completions.filter(function(completion) {
        return completion.habitId === habitId;
    });
}

/* Counts how many times one habit was completed in the last 7 days. */
function getWeeklyCompletionCount(habitId) {
    const weekDates = getLastSevenDates();

    return weekDates.filter(function(date) {
        return isHabitCompletedOnDate(habitId, date);
    }).length;
}

/* Finds the longest active streak across all habits. */
function getLongestCurrentStreak() {
    let longestStreak = 0;

    appState.habits.forEach(function(habit) {
        const habitCompletions = getCompletionsForHabit(habit.id);
        const streak = calculateStreak(habitCompletions);

        if (streak > longestStreak) {
            longestStreak = streak;
        }
    });

    return longestStreak;
}

/* Counts days this week where every habit was completed. */
function getPerfectDaysThisWeek(weekDates) {
    if (appState.habits.length === 0) {
        return 0;
    }

    return weekDates.filter(function(date) {
        return appState.habits.every(function(habit) {
            return isHabitCompletedOnDate(habit.id, date);
        });
    }).length;
}

/* Shows an inline error message. */
function showError(elementId, message) {
    $(`#${elementId}`).text(message);
}

/* Clears all visible form error messages. */
function clearErrors() {
    $(".form-error").text("");
}

$(document).on("submit", "#signin-form", handleSignIn);

$(document).on("submit", "#signup-form", handleSignUp);

$(document).on("click", "#switch-auth-btn", function() {
    renderAuthScreen($(this).data("mode"));
});

$(document).on("click", "#signout-btn", async function() {
    await signOutUser();
});

$(document).on("click", "#open-add-habit-btn, #empty-create-btn", openAddHabitModal);

$(document).on("click", ".edit-habit-btn", function() {
    openEditHabitModal($(this).data("id"));
});

$(document).on("click", ".delete-habit-btn", function() {
    handleDeleteHabit($(this).data("id"));
});

$(document).on("click", ".complete-btn", function() {
    handleToggleComplete($(this).data("id"));
});

$(document).on("click", ".emoji-option", function() {
    $(".emoji-option").removeClass("active");
    $(this).addClass("active");
    $("#habit-emoji").val($(this).data("emoji"));
});

$("#habit-form").on("submit", handleHabitFormSubmit);

init();