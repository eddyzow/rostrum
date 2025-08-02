document.addEventListener("DOMContentLoaded", () => {
  const heroFormContainer = document.getElementById("hero-form-container");

  // --- State Rendering Functions ---

  const renderLoggedOutState = () => {
    heroFormContainer.innerHTML = `
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <input id="event-code-input" type="text" placeholder="Enter Event Code" class="dark-input w-full sm:w-auto flex-grow text-center text-lg px-4 py-3 rounded-md border transition focus:ring-2 focus:ring-indigo-500"/>
                <button id="join-event-button" class="bg-indigo-600 text-white w-full sm:w-auto px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition text-lg">
                    Join Event
                </button>
            </div>
            <p class="mt-4 text-sm text-gray-500">
                Organizing a hackathon?
                <a href="/organizer" class="text-indigo-400 hover:underline">Log in to the organizer portal here.</a>
            </p>
            <p id="join-error-message" class="text-red-400 text-sm mt-2 h-5"></p>
        `;
    setupJoinFormListeners();
  };

  const renderLoggedInState = (eventName) => {
    heroFormContainer.innerHTML = `
            <div class="text-center">
                <p class="text-lg text-gray-400">You're currently attending: <strong class="text-white">${eventName}</strong></p>
                <div class="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                    <a href="/docs/dashboard/" class="bg-indigo-600 text-white w-full sm:w-auto px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition text-lg">Go to Attendee Dashboard</a>
                    <button id="logout-button" class="bg-gray-700 text-white w-full sm:w-auto px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition text-lg">Log Out</button>
                </div>
            </div>
        `;
    document.getElementById("logout-button").addEventListener("click", () => {
      localStorage.removeItem("podium-pro-token");
      renderLoggedOutState();
    });
  };

  // --- Initial Login Status Check ---
  const checkLoginStatus = async () => {
    const token = localStorage.getItem("podium-pro-token");
    if (!token) {
      renderLoggedOutState();
      return;
    }

    try {
      const response = await fetch(
        "https://podium-d74a4f5f498c.herokuapp.com/api/get-session-info",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      const data = await response.json();
      if (data.success) {
        renderLoggedInState(data.eventName);
      } else {
        localStorage.removeItem("podium-pro-token");
        renderLoggedOutState();
      }
    } catch (error) {
      console.error("Session check failed:", error);
      renderLoggedOutState();
    }
  };

  // --- Event Listeners for Join Form ---
  function setupJoinFormListeners() {
    const eventCodeInput = document.getElementById("event-code-input");
    const joinEventButton = document.getElementById("join-event-button");
    const joinErrorMessage = document.getElementById("join-error-message");

    const handleVerification = async () => {
      const eventCode = eventCodeInput.value;
      joinErrorMessage.textContent = "";

      if (eventCode.length !== 6) {
        eventCodeInput.classList.add("shake");
        setTimeout(() => eventCodeInput.classList.remove("shake"), 820);
        return;
      }

      joinEventButton.textContent = "Verifying...";
      joinEventButton.disabled = true;
      eventCodeInput.disabled = true;

      try {
        const response = await fetch(
          "https://podium-d74a4f5f498c.herokuapp.com/api/verify-code",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventCode }),
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        showMagicLinkForm(data.eventName, eventCode);
      } catch (error) {
        joinErrorMessage.textContent = `Error: ${error.message}`;
        eventCodeInput.classList.add("shake");
        setTimeout(() => eventCodeInput.classList.remove("shake"), 820);
        joinEventButton.textContent = "Join Event";
        joinEventButton.disabled = false;
        eventCodeInput.disabled = false;
      }
    };

    joinEventButton.addEventListener("click", handleVerification);
    eventCodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !joinEventButton.disabled) handleVerification();
    });
    eventCodeInput.addEventListener("input", (e) => {
      e.target.value = e.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 6);
    });
  }

  function showMagicLinkForm(eventName, eventCode) {
    heroFormContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                <p class="text-lg text-gray-400">Enter your details for: <strong class="text-white">${eventName}</strong></p>
                <input id="full-name-input" type="text" placeholder="Full Name" class="dark-input w-full text-center text-lg px-4 py-3 rounded-md border transition focus:ring-2 focus:ring-indigo-500">
                <div class="w-full">
                    <input id="email-input" type="email" placeholder="Email Address" class="dark-input w-full text-center text-lg px-4 py-3 rounded-md border transition focus:ring-2 focus:ring-indigo-500">
                    <p id="email-validator-message" class="text-sm text-left mt-1 h-4"></p>
                </div>
                <button id="get-magic-link-button" class="bg-indigo-600 text-white w-full px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition text-lg">
                    Get Magic Link
                </button>
            </div>
        `;

    const emailInput = document.getElementById("email-input");
    const fullNameInput = document.getElementById("full-name-input");
    const getMagicLinkButton = document.getElementById("get-magic-link-button");
    const emailValidatorMessage = document.getElementById(
      "email-validator-message"
    );

    getMagicLinkButton.disabled = true;
    getMagicLinkButton.classList.add("opacity-50", "cursor-not-allowed");

    const validateEmail = (email) => {
      const re =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(String(email).toLowerCase());
    };

    const checkFormValidity = () => {
      const isEmailValid = validateEmail(emailInput.value);
      const isNameEntered = fullNameInput.value.trim() !== "";

      if (isEmailValid && isNameEntered) {
        getMagicLinkButton.disabled = false;
        getMagicLinkButton.classList.remove("opacity-50", "cursor-not-allowed");
      } else {
        getMagicLinkButton.disabled = true;
        getMagicLinkButton.classList.add("opacity-50", "cursor-not-allowed");
      }
    };

    fullNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        emailInput.focus();
      }
    });

    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        getMagicLinkButton.click();
      }
    });

    emailInput.addEventListener("input", () => {
      const email = emailInput.value;
      if (email === "") {
        emailValidatorMessage.textContent = "";
        emailValidatorMessage.className = "text-sm text-left mt-1 h-4";
      } else if (validateEmail(email)) {
        emailValidatorMessage.textContent = "Valid email";
        emailValidatorMessage.className =
          "text-sm text-left mt-1 h-4 text-green-400";
      } else {
        emailValidatorMessage.textContent =
          "Please enter a valid email address";
        emailValidatorMessage.className =
          "text-sm text-left mt-1 h-4 text-red-400";
      }
      checkFormValidity();
    });

    fullNameInput.addEventListener("input", checkFormValidity);

    getMagicLinkButton.addEventListener("click", async () => {
      const fullName = fullNameInput.value;
      const email = emailInput.value;

      if (!fullName || !email || !validateEmail(email)) return;

      getMagicLinkButton.textContent = "Sending...";
      getMagicLinkButton.disabled = true;
      getMagicLinkButton.classList.add("opacity-50", "cursor-not-allowed");

      try {
        const response = await fetch(
          "https://podium-d74a4f5f498c.herokuapp.com/api/send-magic-link",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullName, email, eventCode }),
          }
        );

        if (!response.ok) throw new Error("Network response was not ok.");

        setTimeout(() => {
          const getEmailProviderLink = (email) => {
            const domain = email.split("@")[1];
            const providers = {
              "gmail.com": { name: "Gmail", url: "https://mail.google.com" },
              "outlook.com": {
                name: "Outlook",
                url: "https://outlook.live.com",
              },
              "yahoo.com": {
                name: "Yahoo Mail",
                url: "https://mail.yahoo.com",
              },
              "icloud.com": {
                name: "iCloud Mail",
                url: "https://www.icloud.com/mail",
              },
            };
            return providers[domain] || null;
          };

          let extraButtonHTML = "";
          const provider = getEmailProviderLink(email);
          if (provider) {
            extraButtonHTML = `<a href="${provider.url}" target="_blank" class="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition text-md mt-4 inline-block">Open ${provider.name}</a>`;
          }

          heroFormContainer.innerHTML = `
                        <div class="text-center">
                            <h3 class="text-2xl font-bold text-white">Check Your Inbox!</h3>
                            <p class="text-lg text-gray-400 mt-2">A magic link has been sent to <strong>${email}</strong>.</p>
                            <p class="text-sm text-gray-500 mt-4">Click the link in the email to log in and start judging.</p>
                            <p class="text-xs text-gray-600 mt-2">(Check your spam folder -- there's a high chance it's in there!)</p>
                            ${extraButtonHTML}
                        </div>
                    `;
        }, 500);
      } catch (error) {
        console.error("Failed to send magic link:", error);
        emailValidatorMessage.textContent =
          "Something went wrong. Please try again.";
        emailValidatorMessage.className =
          "text-sm text-center mt-1 h-4 text-red-400";
        getMagicLinkButton.textContent = "Get Magic Link";
        getMagicLinkButton.disabled = false;
        getMagicLinkButton.classList.remove("opacity-50", "cursor-not-allowed");
      }
    });
  }

  // --- Initial Load ---
  checkLoginStatus();
});
