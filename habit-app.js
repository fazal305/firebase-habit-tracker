const appState = {
    currentUser: null,
    habits: [],
    completions: [],
    habitUnsubscribe: null,
    completionUnsubscribe: null
};

/* Message queued to show on the auth screen after a forced sign-out (e.g. expired session). */
let pendingAuthNotice = null;

const appRoot = document.getElementById("app-root");
const habitModal = document.getElementById("habit-modal");
const habitForm = document.getElementById("habit-form");
const modalTitle = document.getElementById("habit-modal-title");
const habitIdInput = document.getElementById("habit-id");
const habitNameInput = document.getElementById("habit-name");
const habitIconInput = document.getElementById("habit-emoji");
const habitFrequencyInput = document.getElementById("habit-frequency");
const habitColorInput = document.getElementById("habit-color");

let manualSignOut = false;

function init() {
    watchAuthState(function (user) {
        const hadUser = !!appState.currentUser;
        appState.currentUser = user;

        if (user) {
            renderDashboard(user);
            startRealtimeListeners(user.uid);
        } else {
            stopRealtimeListeners();

            if (hadUser && !manualSignOut) {
                pendingAuthNotice = getErrorMessage("auth/user-token-expired");
            }

            manualSignOut = false;
            renderAuthScreen("signin");
        }
    });

    setupStaticEvents();
}

function setupStaticEvents() {
    document.getElementById("close-modal-btn").addEventListener("click", closeHabitModal);
    document.getElementById("cancel-modal-btn").addEventListener("click", closeHabitModal);
    habitForm.addEventListener("submit", handleHabitFormSubmit);

    habitModal.addEventListener("click", function (event) {
        if (event.target === habitModal) {
            closeHabitModal();
        }
    });

    document.querySelectorAll(".emoji-option").forEach(function (button) {
        button.addEventListener("click", function () {
            document.querySelectorAll(".emoji-option").forEach(function (option) {
                option.classList.remove("active");
            });

            button.classList.add("active");
            habitIconInput.value = button.dataset.emoji;
        });
    });
}

function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (textContent !== undefined) {
        element.textContent = textContent;
    }

    return element;
}

function renderAuthScreen(mode) {
    const isSignUp = mode === "signup";
    appRoot.innerHTML = "";

    const page = createElement("main", "auth-page");
    const card = createElement("section", "auth-card");
    const badge = createElement("span", "auth-badge", "Firebase Auth");
    const title = createElement("h1", "", isSignUp ? "Create Account" : "Welcome Back");
    const intro = createElement(
        "p",
        "",
        isSignUp
            ? "Create your account and start tracking habits in the cloud."
            : "Sign in to continue your habit streaks."
    );

    const form = createElement("form");
    form.id = isSignUp ? "signup-form" : "signin-form";
    form.appendChild(createAuthField("auth-email", "Email", "email", "you@example.com"));
    form.appendChild(createAuthField("auth-password", "Password", "password", "Minimum 6 characters"));

    if (isSignUp) {
        form.appendChild(createAuthField("auth-confirm-password", "Confirm Password", "password", "Repeat password"));
    }

    const formError = createElement("small", "form-error");
    formError.id = "auth-form-error";

    if (pendingAuthNotice) {
        formError.textContent = pendingAuthNotice;
        pendingAuthNotice = null;
    }

    const submitButton = createElement("button", "btn-neon full-width", isSignUp ? "Sign Up" : "Sign In");
    submitButton.type = "submit";
    form.append(formError, submitButton);
    form.addEventListener("submit", isSignUp ? handleSignUp : handleSignIn);

    const switchWrap = createElement("div", "auth-switch");
    switchWrap.appendChild(document.createTextNode(isSignUp ? "Already have an account? " : "Do not have an account? "));
    const switchButton = createElement("button", "", isSignUp ? "Sign In" : "Sign Up");
    switchButton.type = "button";
    switchButton.addEventListener("click", function () {
        renderAuthScreen(isSignUp ? "signin" : "signup");
    });
    switchWrap.appendChild(switchButton);

    card.append(badge, title, intro, form, switchWrap);
    page.appendChild(card);
    appRoot.appendChild(page);
}

function createAuthField(id, labelText, type, placeholder) {
    const label = createElement("label", "form-field");
    label.setAttribute("for", id);

    const labelSpan = createElement("span", "", labelText);
    const input = createElement("input");
    input.id = id;
    input.type = type;
    input.placeholder = placeholder;

    const error = createElement("small", "form-error");
    error.id = `${id}-error`;

    label.append(labelSpan, input, error);
    return label;
}

function startRealtimeListeners(userId) {
    stopRealtimeListeners();

    appState.habitUnsubscribe = loadHabits(userId, function (habits) {
        appState.habits = habits;
        renderDashboard(appState.currentUser);
    });

    appState.completionUnsubscribe = loadCompletions(userId, function (completions) {
        appState.completions = completions;
        renderDashboard(appState.currentUser);
    });
}

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

function renderDashboard(user) {
    if (!user) {
        return;
    }

    appRoot.innerHTML = "";

    const shell = createElement("main", "dashboard-shell");
    shell.append(
        renderHeader(user),
        renderDateCard(),
        renderStatsGrid(),
        renderHabitsGrid(),
        renderWeeklyOverview(),
        renderFloatingAddButton()
    );

    appRoot.appendChild(shell);
}

function renderHeader(user) {
    const header = createElement("header", "app-header");
    const titleWrap = createElement("div");
    titleWrap.append(
        createElement("h1", "brand-title", "Firebase Habit Tracker"),
        createElement("div", "user-email", user.email)
    );

    const signOutButton = createElement("button", "secondary-btn", "Sign Out");
    signOutButton.type = "button";
    signOutButton.addEventListener("click", function () {
        manualSignOut = true;
        signOutUser();
    });

    header.append(titleWrap, signOutButton);
    return header;
}

function renderDateCard() {
    const todayText = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    const card = createElement("section", "date-card");
    card.append(createElement("span", "", "Today"), createElement("h2", "", todayText));
    return card;
}

function renderStatsGrid() {
    const grid = createElement("section", "stats-grid");
    const weekDates = getLastSevenDates();
    const stats = [
        ["Total Habits", appState.habits.length],
        ["Perfect Days This Week", getPerfectDaysThisWeek(weekDates)],
        ["Longest Current Streak", getLongestCurrentStreak()]
    ];

    stats.forEach(function (stat) {
        const card = createElement("article", "stat-card");
        card.append(createElement("p", "", stat[0]), createElement("strong", "", String(stat[1])));
        grid.appendChild(card);
    });

    return grid;
}

function renderHabitsGrid() {
    const grid = createElement("section", "habit-grid");

    if (appState.habits.length === 0) {
        const empty = createElement("section", "empty-state");
        empty.append(
            createElement("h2", "", "No habits yet"),
            createElement("p", "", "Create your first habit and start building a real streak.")
        );

        const button = createElement("button", "btn-neon", "+ Create Your First Habit");
        button.type = "button";
        button.addEventListener("click", openAddHabitModal);
        empty.appendChild(button);
        grid.appendChild(empty);
        return grid;
    }

    appState.habits.forEach(function (habit) {
        grid.appendChild(renderHabitCard(habit));
    });

    return grid;
}

function renderHabitCard(habit) {
    const today = getTodayString();
    const isCompleted = isHabitCompletedOnDate(habit.id, today);
    const weekCount = getWeeklyCompletionCount(habit.id);
    const completionPercent = Math.round((weekCount / 7) * 100);
    const currentStreak = calculateStreak(getCompletionsForHabit(habit.id));

    const card = createElement("article", "habit-card");
    card.style.borderLeftColor = habit.color;

    const top = createElement("div", "habit-top");
    const textWrap = createElement("div");
    textWrap.append(
        createElement("div", "habit-emoji", habit.emoji || "HBT"),
        createElement("h3", "habit-name", habit.name),
        createElement("div", "habit-frequency", habit.frequency)
    );

    const completeButton = createElement("button", isCompleted ? "complete-btn completed" : "complete-btn", isCompleted ? "OK" : "");
    completeButton.type = "button";
    completeButton.setAttribute("aria-label", isCompleted ? "Mark incomplete" : "Mark complete");
    completeButton.addEventListener("click", function () {
        handleToggleComplete(habit.id);
    });

    top.append(textWrap, completeButton);

    const progress = createElement("div", "progress");
    const progressBar = createElement("div", "progress-bar");
    progressBar.style.width = `${completionPercent}%`;
    progress.appendChild(progressBar);

    const actions = createElement("div", "habit-actions");
    const editButton = createElement("button", "secondary-btn small-btn", "Edit");
    const deleteButton = createElement("button", "danger-btn small-btn", "Delete");
    editButton.type = "button";
    deleteButton.type = "button";
    editButton.addEventListener("click", function () { openEditHabitModal(habit.id); });
    deleteButton.addEventListener("click", function () { handleDeleteHabit(habit.id); });
    actions.append(editButton, deleteButton);

    card.append(
        top,
        createElement("div", "streak-badge", `${currentStreak} day streak`),
        createElement("p", "muted-text", `This week: ${weekCount}/7 days`),
        progress,
        actions
    );

    return card;
}

function renderWeeklyOverview() {
    const panel = createElement("section", "weekly-panel");

    if (appState.habits.length === 0) {
        return panel;
    }

    const weekDates = getLastSevenDates();
    panel.appendChild(createElement("h2", "", "Weekly Overview"));

    const header = createElement("div", "week-row week-header");
    header.appendChild(createElement("div", "", "Habit"));
    weekDates.forEach(function (date) {
        header.appendChild(createElement("div", "center-text", date.slice(5)));
    });
    panel.appendChild(header);

    appState.habits.forEach(function (habit) {
        const row = createElement("div", "week-row");
        row.appendChild(createElement("div", "week-habit-name", `${habit.emoji || "HBT"} ${habit.name}`));

        weekDates.forEach(function (date) {
            const dot = createElement("span", isHabitCompletedOnDate(habit.id, date) ? "week-dot complete" : "week-dot");
            dot.title = date;
            row.appendChild(dot);
        });

        panel.appendChild(row);
    });

    return panel;
}

function renderFloatingAddButton() {
    const button = createElement("button", "floating-add-btn", "+");
    button.type = "button";
    button.setAttribute("aria-label", "Add habit");
    button.addEventListener("click", openAddHabitModal);
    return button;
}

function openAddHabitModal() {
    modalTitle.textContent = "Add Habit";
    habitIdInput.value = "";
    habitNameInput.value = "";
    habitIconInput.value = "WTR";
    habitFrequencyInput.value = "daily";
    habitColorInput.value = "#00f5ff";
    setActiveIcon("WTR");
    clearErrors();
    openHabitModal();
}

function openEditHabitModal(habitId) {
    const habit = appState.habits.find(function (item) {
        return item.id === habitId;
    });

    if (!habit) {
        return;
    }

    modalTitle.textContent = "Edit Habit";
    habitIdInput.value = habit.id;
    habitNameInput.value = habit.name;
    habitIconInput.value = habit.emoji || "WTR";
    habitFrequencyInput.value = habit.frequency;
    habitColorInput.value = habit.color;
    setActiveIcon(habit.emoji || "WTR");
    clearErrors();
    openHabitModal();
}

function openHabitModal() {
    habitModal.classList.remove("hidden");
    habitModal.setAttribute("aria-hidden", "false");
    habitNameInput.focus();
}

function closeHabitModal() {
    habitModal.classList.add("hidden");
    habitModal.setAttribute("aria-hidden", "true");
}

function setActiveIcon(icon) {
    document.querySelectorAll(".emoji-option").forEach(function (button) {
        button.classList.toggle("active", button.dataset.emoji === icon);
    });
}

async function handleHabitFormSubmit(event) {
    event.preventDefault();
    clearErrors();

    const habitId = habitIdInput.value;
    const habitName = habitNameInput.value.trim();

    if (!habitName) {
        showError("habit-name-error", "Habit name is required.");
        return;
    }

    const habitData = {
        name: habitName,
        emoji: habitIconInput.value,
        frequency: habitFrequencyInput.value,
        color: habitColorInput.value
    };

    try {
        if (habitId) {
            await updateHabit(appState.currentUser.uid, habitId, habitData);
        } else {
            await addHabit(appState.currentUser.uid, habitData);
        }

        closeHabitModal();
        showStatusToast(habitId ? "Habit updated successfully." : "Habit added successfully.", "success");
    } catch (error) {
        if (isSessionExpiredError(error)) {
            closeHabitModal();
            handleSessionExpired();
            return;
        }

        showError("habit-form-error", "Could not save habit. Check Firebase rules.");
    }
}

async function handleToggleComplete(habitId) {
    const today = getTodayString();
    const isCompleted = isHabitCompletedOnDate(habitId, today);

    try {
        if (isCompleted) {
            await markIncomplete(appState.currentUser.uid, habitId, today);
            showStatusToast("Habit marked incomplete.", "success");
        } else {
            await markComplete(appState.currentUser.uid, habitId, today);
            showStatusToast("Habit marked complete!", "success");
        }
    } catch (error) {
        if (isSessionExpiredError(error)) {
            handleSessionExpired();
            return;
        }

        console.error(error);
    }
}

async function handleDeleteHabit(habitId) {
    if (!confirm("Delete this habit and its completion history?")) {
        return;
    }

    try {
        await deleteHabit(appState.currentUser.uid, habitId);
        showStatusToast("Habit deleted.", "success");
    } catch (error) {
        if (isSessionExpiredError(error)) {
            handleSessionExpired();
            return;
        }

        console.error(error);
    }
}

async function handleSignIn(event) {
    event.preventDefault();
    clearErrors();

    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const result = await signIn(email, password);

    if (!result.success) {
        showError("auth-form-error", result.message);
    }
}

async function handleSignUp(event) {
    event.preventDefault();
    clearErrors();

    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const confirmPassword = document.getElementById("auth-confirm-password").value;

    if (password !== confirmPassword) {
        showError("auth-confirm-password-error", "Passwords do not match.");
        return;
    }

    const result = await signUp(email, password);

    if (!result.success) {
        showError("auth-form-error", result.message);
    }
}

function getTodayString() {
    return formatDateKey(new Date());
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isHabitCompletedOnDate(habitId, date) {
    return appState.completions.some(function (completion) {
        return completion.habitId === habitId && completion.date === date;
    });
}

function getCompletionsForHabit(habitId) {
    return appState.completions.filter(function (completion) {
        return completion.habitId === habitId;
    });
}

function getWeeklyCompletionCount(habitId) {
    return getLastSevenDates().filter(function (date) {
        return isHabitCompletedOnDate(habitId, date);
    }).length;
}

function getLongestCurrentStreak() {
    return appState.habits.reduce(function (longestStreak, habit) {
        return Math.max(longestStreak, calculateStreak(getCompletionsForHabit(habit.id)));
    }, 0);
}

function getPerfectDaysThisWeek(weekDates) {
    if (appState.habits.length === 0) {
        return 0;
    }

    return weekDates.filter(function (date) {
        return appState.habits.every(function (habit) {
            return isHabitCompletedOnDate(habit.id, date);
        });
    }).length;
}

let statusToastTimeout = null;

/* Shows a brief auto-dismissing status message (success or error) outside the modal. */
function showStatusToast(message, type) {
    const toast = document.getElementById("status-toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.remove("hidden", "success", "error");
    toast.classList.add(type === "error" ? "error" : "success");

    if (statusToastTimeout) {
        clearTimeout(statusToastTimeout);
    }

    statusToastTimeout = setTimeout(function () {
        toast.classList.add("hidden");
    }, 3000);
}

/* Handles an expired/invalid session: notifies the user and signs them out to the login screen. */
function handleSessionExpired() {
    pendingAuthNotice = getErrorMessage("auth/user-token-expired");
    forceSignOutExpiredSession();
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = message;
    }
}

function clearErrors() {
    document.querySelectorAll(".form-error").forEach(function (element) {
        element.textContent = "";
    });
}

init();
