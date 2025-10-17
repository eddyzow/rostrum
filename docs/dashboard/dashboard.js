// dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  const dashboardContent = document.getElementById("dashboard-content");
  const logoutButton = document.getElementById("logout-button");
  let currentUserData = null; // Store user data globally within the script
  let statusPollInterval = null; // To hold the interval ID
  let countdownInterval = null; // To hold the countdown interval ID
  let lastKnownToken = null; // Store the last known valid token for *this specific tab*

  // Define the relative path to the main Podium Pro page
  const PODIUM_PRO_MAIN_PAGE_PATH = "../";

  // Inject custom styles for the voting slider
  const style = document.createElement("style");
  style.textContent = `
    .vote-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 12px;
        background: #374151; /* gray-700 */
        border-radius: 9999px;
        outline: none;
        transition: opacity .2s;
    }

    .vote-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 32px;
        height: 32px;
        background: #ffffff;
        cursor: pointer;
        border-radius: 50%;
        border: 5px solid #4f46e5; /* indigo-600 */
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
        transition: transform 0.1s ease-in-out;
    }
    
    .vote-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
    }

    .vote-slider::-moz-range-thumb {
        width: 32px;
        height: 32px;
        background: #ffffff;
        cursor: pointer;
        border-radius: 50%;
        border: 5px solid #4f46e5;
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
        transition: transform 0.1s ease-in-out;
    }
    
    .vote-slider::-moz-range-thumb:hover {
        transform: scale(1.1);
    }
  `;
  document.head.appendChild(style);

  const verifyTokenAndRender = async () => {
    const token = localStorage.getItem("podium-pro-token");
    if (!token) {
      dashboardContent.innerHTML = `<p class="text-red-400 text-center">Login token not found. Please log in again.</p>`;
      setTimeout(() => {
        window.location.href = PODIUM_PRO_MAIN_PAGE_PATH;
      }, 3000);
      return;
    }

    try {
      const response = await fetch(
        "https://rostrum-d74a4f5f498c.herokuapp.com/api/verify-magic-token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message);

      currentUserData = data.userData;
      localStorage.setItem("podium-pro-token", data.sessionToken);
      lastKnownToken = data.sessionToken; // Set lastKnownToken for this tab on successful verification

      renderDashboard(currentUserData);

      // Immediately poll for the latest status after initial render
      if (
        currentUserData.shippingOpen ||
        currentUserData.projectData ||
        currentUserData.votingOpen
      ) {
        pollProjectStatus(); // Immediate poll
        if (statusPollInterval) clearInterval(statusPollInterval);
        statusPollInterval = setInterval(pollProjectStatus, 10000);
        startCountdown();
      }
    } catch (error) {
      dashboardContent.innerHTML = `<p class="text-red-400 text-center">${error.message} Redirecting...</p>`;
      localStorage.removeItem("podium-pro-token");
      setTimeout(() => {
        window.location.href = PODIUM_PRO_MAIN_PAGE_PATH;
      }, 3000);
    }
  };

  async function pollProjectStatus() {
    const currentToken = localStorage.getItem("podium-pro-token");

    if (!currentToken || currentToken !== lastKnownToken) {
      console.warn(
        "Token mismatch detected in localStorage. Redirecting this tab."
      );
      alert("Your session has changed or expired in another tab. Redirecting.");
      clearInterval(statusPollInterval);
      window.location.href = PODIUM_PRO_MAIN_PAGE_PATH;
      return;
    }

    startCountdown();
    try {
      const response = await fetch(
        "https://rostrum-d74a4f5f498c.herokuapp.com/api/get-project-status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: currentToken }),
        }
      );
      const data = await response.json();
      if (data.success) {
        if (data.sessionToken && data.sessionToken !== lastKnownToken) {
          localStorage.setItem("podium-pro-token", data.sessionToken);
          lastKnownToken = data.sessionToken;
          console.log("Session token renewed by server and updated.");
        }

        const oldCurrentUserJSON = JSON.stringify(currentUserData);
        const newCurrentUserData = {
          name: data.name,
          email: data.email,
          userId: data.userId,
          event: data.event,
          shippingOpen: data.shippingOpen,
          votingOpen: data.votingOpen,
          teamData: data.teamData,
          teamName: data.teamName,
          projectData: data.projectData,
          isCaptain: data.isCaptain,
          eventSettings: data.eventSettings,
          votesCast: data.votesCast,
          voteLimit: data.voteLimit,
        };
        const newCurrentUserJSON = JSON.stringify(newCurrentUserData);

        if (oldCurrentUserJSON !== newCurrentUserJSON) {
          console.log("Client data out of sync with server, updating UI...");
          currentUserData = newCurrentUserData;
          renderDashboard(currentUserData);
        } else {
          console.log("Client data already in sync.");
        }
      } else {
        if (data.message.includes("Invalid session")) {
          console.warn(
            "Server reported invalid session during poll. Redirecting this tab."
          );
          alert("Your session is no longer valid. Please log in again.");
          clearInterval(statusPollInterval);
          localStorage.removeItem("podium-pro-token");
          window.location.href = PODIUM_PRO_MAIN_PAGE_PATH;
        }
      }
    } catch (error) {
      console.error("Polling request failed:", error);
    }
  }

  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    let countdown = 10;
    const timerElement = document.getElementById("countdown-timer");

    if (!timerElement) return;

    const updateTimer = () => {
      if (timerElement) {
        timerElement.textContent = `(Updates in ${countdown}s)`;
      }
      countdown--;
    };

    updateTimer();
    countdownInterval = setInterval(() => {
      if (countdown < 0) {
        if (timerElement) timerElement.textContent = `(Updating...)`;
        clearInterval(countdownInterval);
      } else {
        updateTimer();
      }
    }, 1000);
  }

  function renderDashboard(userData) {
    if (userData.votingOpen) {
      renderVotingPortal(userData);
    } else {
      renderProjectPortal(userData);
    }
  }

  function renderProjectPortal(userData) {
    let projectSectionHTML = "";
    let teamSectionHTML = "";
    const isProjectManager = userData.isCaptain;

    if (userData.projectData) {
      projectSectionHTML = `
        <div id="project-section" class="bg-gray-800/50 rounded-2xl p-8 mt-10">
        </div>`;

      const addTeammateFormDisplay = isProjectManager ? "" : "hidden";
      const teamMessage = isProjectManager
        ? `
        <p class="text-lg text-gray-400 mt-2 mb-4">
          You are the project manager. Teammates can also join your team by logging into the event with the project code:
          <span class="font-mono text-white text-md">${userData.projectData.projectCode}</span>
        </p>
      `
        : `
        <p class="text-base text-gray-400 mt-2 mb-4">
          Ask your team's project manager to add new members.
        </p>
      `;

      teamSectionHTML = `
        <div class="bg-gray-800/50 rounded-2xl p-8 mt-10">
          <div class="flex justify-between items-center mb-6">
                 <h3 class="text-2xl font-bold text-white">Your Team</h3>
                 <form id="team-name-form" class="flex items-center gap-2">
                   <input type="text" id="team-name-input" placeholder="Team Name" class="dark-input rounded-md text-md p-2 bg-gray-900/50" value="${
                     userData.teamName || ""
                   }">
                   <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition text-m">Save</button>
                 </form>
          </div>
          ${teamMessage}
          <div class="space-y-3" id="team-list"></div>
          <form id="add-teammate-form" class="flex flex-col sm:flex-row items-center gap-3 mt-6 ${addTeammateFormDisplay}">
              <input type="text" id="teammate-name" placeholder="Teammate's Name" class="dark-input flex-grow w-full rounded-md text-md p-2">
              <input type="email" id="teammate-email" placeholder="Teammate's Email" class="dark-input flex-grow w-full rounded-md text-md p-2">
              <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition w-full sm:w-auto">Add</button>
          </form>
        </div>`;
    } else {
      projectSectionHTML = `
        <div class="bg-gray-800/50 rounded-2xl p-8 mt-10 text-center">
            <h3 class="text-2xl font-bold text-white">Project Submissions</h3>
            <p class="text-gray-400 mt-4">You are not part of a project yet. Create or join one below.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-2xl mx-auto">
              <div id="create-project-form-container">
                <form id="create-project-form" class="space-y-4 text-left">
                    <label class="block text-xl font-medium text-white mb-2">Create a New Project</label>
                    <p class="text-gray-400">Name your project to get started:</p>
                    <input type="text" id="new-project-name" placeholder="My Awesome Project" maxlength="100" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2">
                    <button type="submit" id="create-project-button" class="bg-indigo-600 text-white w-full px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        Create Project
                    </button>
                    <p id="create-project-error" class="text-red-400 text-xs mt-1 h-4"></p>
                </form>
              </div>
              <div class="border-t-2 md:border-t-0 md:border-l-2 border-gray-700 pt-6 md:pt-0 md:pl-6" id="join-project-form-container">
                <form id="join-project-form" class="space-y-4 text-left">
                    <label for="project-code-input" class="block text-xl font-medium text-white">Join an Existing Project</label>
                    <p class="text-gray-400">Enter a 4-character project code:</p>
                    <input type="text" id="project-code-input" placeholder="e.g., A1B2" maxlength="4" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2 text-center uppercase">
                    <button type="submit" id="join-project-button" class="bg-indigo-600 text-white w-full px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        Join Project
                    </button>
                    <p id="join-project-error" class="text-red-400 text-xs mt-1 h-4"></p>
                </form>
              </div>
            </div>
        </div>
      `;
      teamSectionHTML = "";
    }

    dashboardContent.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <h2 class="text-3xl font-bold text-white">Welcome to ${userData.event}, ${userData.name}!</h2>
                <p class="text-gray-400 mt-2">Manage your project submission and team below.</p>
                ${projectSectionHTML}
                ${teamSectionHTML}
            </div>`;

    if (userData.projectData) {
      renderTeamList(userData.teamData, userData.isCaptain, userData.userId);
      renderProjectSection(
        currentUserData.projectData,
        currentUserData.shippingOpen,
        currentUserData.isCaptain
      );
      setupTeamManagement();
    } else {
      setupProjectForms();
    }
  }

  async function renderProjectSection(
    projectData,
    shippingOpen,
    isProjectManager
  ) {
    const projectSection = document.getElementById("project-section");
    const status = projectData?.status ?? 0;
    const shipNote = projectData?.shipNote ?? "";
    const projectCode = projectData?.projectCode || "N/A";
    const eventSettings = currentUserData.eventSettings || {};

    const statusMap = {
      0: { text: "Not Shipped", class: "status-red" },
      1: { text: "Needs Attention", class: "status-yellow" },
      2: { text: "Awaiting Review", class: "status-yellow" },
      3: { text: "Approved", class: "status-green" },
    };

    const currentStatus = statusMap[status];

    const isEditable = status < 2;
    const isApproved = status === 3;
    const showSaveButton = isEditable;
    const showShipButton = isEditable;
    const showUnshipButton = status === 2;

    let noteHTML = "";
    if (shipNote) {
      const noteClass =
        status === 1
          ? "bg-yellow-900/50 border-yellow-700 text-yellow-300"
          : "bg-indigo-900/50 border-indigo-700 text-indigo-300";
      noteHTML = `<div class="${noteClass} p-4 rounded-md my-4 flex justify-between items-center">
                            <p><strong>Organizer Note:</strong> ${shipNote
                              .replace(/&/g, "&amp;")
                              .replace(/</g, "&lt;")
                              .replace(/>/g, "&gt;")
                              .replace(/"/g, "&quot;")
                              .replace(/'/g, "&#039;")}</p>
                            <button id="dismiss-note-btn" class="text-gray-400 hover:text-white text-2xl font-bold leading-none p-2">×</button>
                        </div>`;
    }
    if (isApproved) {
      noteHTML += `<p class="text-base text-white font-bold mb-4">Your project has been approved and can no longer be edited. If you need to make changes, please see an organizer.</p>`;
    }

    let buttonArea = "";
    if (showSaveButton) {
      buttonArea = `<button id="save-button" type="button" class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition text-lg">Save Project</button>`;
    }

    if (showShipButton) {
      buttonArea += `
        <div class="flex items-center">
          <button id="ship-button" type="button" class="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition text-lg ml-4 ${
            !shippingOpen
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-green-700"
          }" ${!shippingOpen ? "disabled" : ""}>
            Mark as Shipped
          </button>
        </div>
      `;
    } else if (showUnshipButton) {
      buttonArea = `
        <button id="unship-button" type="button" class="bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition text-lg">Unship Project</button>
      `;
    }

    const getLabel = (field, isRequired) => {
      const requiredText = isRequired
        ? '<span class="text-red-400">*</span>'
        : "";
      return `<label for="${field}" class="block text-m font-medium text-gray-400">${field
        .replace("-", " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")} ${requiredText}</label>`;
    };

    projectSection.innerHTML = `
            <div class="flex justify-between items-start">
                <h3 class="text-2xl font-bold text-white">
                    Your Project
                </h3>
                <div class="flex items-center space-x-4">
                    <p class="text-lg font-medium text-gray-400">Project Code:</p>
                    <div class="flex items-center bg-gray-900/50 rounded-md p-2">
                        <p id="project-code-display" class="font-mono text-xl text-white mr-4">${projectCode}</p>
                        <button id="copy-code-button" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition">Copy</button>
                    </div>
                </div>
            </div>
            <div class="mb-6">
                <span id="status-indicator" class="status-indicator ping-animation ${
                  currentStatus.class
                }">${currentStatus.text}</span>
                <span id="countdown-timer" class="text-xs text-gray-500 ml-2"></span>
            </div>
            ${noteHTML}
            <form id="project-form" class="space-y-4" onsubmit="return false;">
<div>
                    ${getLabel("project-name", true)}
                    <input type="text" id="project-name" placeholder="e.g., EcoSort AI" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2" value="${
                      projectData?.projectName || ""
                    }" ${!isEditable || isApproved ? "disabled" : ""}>
                    <p class="text-red-400 text-xs mt-1 h-4 error-message"></p>
                </div>
                <div>
                    ${getLabel("project-desc", true)}
                    <textarea id="project-desc" rows="3" placeholder="A short, compelling description of your project." class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2" ${
                      !isEditable || isApproved ? "disabled" : ""
                    }>${projectData?.description || ""}</textarea>
                    <p class="text-red-400 text-xs mt-1 h-4 error-message"></p>
                </div>
                <div>
                    ${getLabel("demo-url", eventSettings.demoUrlRequired)}
                    <input type="text" id="demo-url" placeholder="https://my-cool-project.com" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2" value="${
                      projectData?.demoUrl || ""
                    }" ${!isEditable || isApproved ? "disabled" : ""}>
                     <p class="text-red-400 text-xs mt-1 h-4 error-message"></p>
                </div>
                <div>
                    ${getLabel("repo-url", eventSettings.repoUrlRequired)}
                    <input type="text" id="repo-url" placeholder="https://github.com/user/repo" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2" value="${
                      projectData?.repoUrl || ""
                    }" ${!isEditable || isApproved ? "disabled" : ""}>
                     <p class="text-red-400 text-xs mt-1 h-4 error-message"></p>
                </div>
                <div>
                    ${getLabel("image-url", eventSettings.imageUrlRequired)}
                    <input type="text" id="image-url" placeholder="https://imgur.com/link-to-screenshot.png" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2" value="${
                      projectData?.imageUrl || ""
                    }" ${!isEditable || isApproved ? "disabled" : ""}>
                     <p class="text-red-400 text-xs mt-1 h-4 error-message"></p>
                </div>
                <div class="text-right flex justify-end gap-4 items-center relative">
                    <div class="flex-grow flex justify-end items-center">
                      ${buttonArea}
                    </div>
                    ${
                      !shippingOpen && showShipButton
                        ? `<p class="absolute left-0 bottom-0 text-xs text-yellow-500">Shipping is currently closed by the organizer.</p>`
                        : ""
                    }
                </div>
            </form>
        `;
    setupProjectForm();
  }

  function renderTeamList(teamMembers, isProjectManager, currentUserId) {
    const teamList = document.getElementById("team-list");
    const addTeammateForm = document.getElementById("add-teammate-form");
    let teamHTML = ``;

    if (teamMembers && teamMembers.length > 0) {
      teamMembers.forEach((member) => {
        const isSelf = member.userId === currentUserId;
        const roleText = member.isCaptain ? "Project Manager" : "";
        const roleDisplay = isSelf
          ? " (You)"
          : roleText
          ? ` (${roleText})`
          : "";
        const isRemovable = isProjectManager && !member.isCaptain;

        teamHTML += `
          <div class="flex items-center justify-between p-2 rounded-md bg-gray-900/50">
            <p>${member.name}${roleDisplay}</p>
            <div class="leave-button-container">
              ${
                isSelf
                  ? `
                <button class="bg-red-600/50 text-red-300 hover:bg-red-500/50 px-3 py-1 text-sm rounded-md transition leave-team-btn" data-email="${member.email}" data-self="true">Leave Team</button>
              `
                  : `
                ${
                  isRemovable
                    ? `
                  <button class="bg-red-600/50 text-red-300 hover:bg-red-500/50 px-3 py-1 text-sm rounded-md transition remove-teammate-btn" data-email="${member.email}">Remove</button>
                `
                    : ""
                }
              `
              }
            </div>
          </div>`;
      });
    } else {
      teamHTML = `<p class="text-gray-400 text-center">Your team list is empty.</p>`;
    }

    if (addTeammateForm) {
      addTeammateForm.classList.toggle("hidden", !isProjectManager);
    }
    teamList.innerHTML = teamHTML;
  }

  async function handleSaveProject() {
    const latestStatus = currentUserData?.projectData?.status ?? 0;
    if (latestStatus >= 2) {
      renderProjectSection(
        currentUserData.projectData,
        currentUserData.shippingOpen,
        currentUserData.isCaptain
      );
      return;
    }

    if (!validateProjectFormLengthOnly()) {
      alert("Please correct the length errors before saving.");
      return;
    }

    const projectData = getProjectDataFromForm();
    const token = localStorage.getItem("podium-pro-token");

    const saveButton = document.getElementById("save-button");
    if (saveButton) {
      saveButton.textContent = "Saving...";
      saveButton.disabled = true;
    }

    try {
      const response = await fetch(
        "https://rostrum-d74a4f5f498c.herokuapp.com/api/save-project",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, projectData }),
        }
      );

      const data = await response.json();
      if (data.success) {
        currentUserData.projectData = {
          ...currentUserData.projectData,
          ...projectData,
          status: data.status,
          shipNote: data.shipNote,
        };
        renderProjectSection(
          currentUserData.projectData,
          currentUserData.shippingOpen,
          currentUserData.isCaptain
        );
      } else {
        alert("Failed to save project: " + data.message);
        if (saveButton) {
          saveButton.textContent = "Save Project";
          saveButton.disabled = false;
        }
      }
      pollProjectStatus();
    } catch (error) {
      console.error("Save project error:", error);
      alert("An unexpected error occurred while saving the project.");
      if (saveButton) {
        saveButton.textContent = "Save Project";
        saveButton.disabled = false;
      }
    }
  }

  async function handleLeaveProject(button) {
    const buttonContainer = button.closest(".leave-button-container");

    if (buttonContainer.querySelector(".confirm-leave-btn")) {
      return;
    }

    const isManager = currentUserData.isCaptain;
    const isOnlyMember = currentUserData.teamData.length === 1;
    let confirmationMessage = "Are you sure you want to leave this project?";

    if (isManager && isOnlyMember) {
      confirmationMessage =
        "You are the only member. Leaving will delete the project. Are you sure?";
    } else if (isManager) {
      confirmationMessage =
        "You are the project manager. The next member will be promoted. Are you sure?";
    }

    const promptContainer = document.createElement("div");
    promptContainer.innerHTML = `
      <span class="text-red-400 text-xs">${confirmationMessage}</span>
      <button type="button" class="bg-red-600 px-2 py-1 text-xs rounded-md confirm-leave-btn">Yes</button>
      <button type="button" class="bg-gray-600 px-2 py-1 text-xs rounded-md cancel-leave-btn">No</button>
    `;

    buttonContainer.innerHTML = "";
    buttonContainer.appendChild(promptContainer);

    promptContainer
      .querySelector(".confirm-leave-btn")
      .addEventListener("click", async () => {
        const token = localStorage.getItem("podium-pro-token");
        try {
          const response = await fetch(
            "https://rostrum-d74a4f5f498c.herokuapp.com/api/leave-project",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            }
          );

          const data = await response.json();
          if (data.success) {
            pollProjectStatus();
          } else {
            alert("Failed to leave project: " + data.message);
            renderTeamList(
              currentUserData.teamData,
              currentUserData.isCaptain,
              currentUserData.userId
            );
          }
        } catch (error) {
          alert("Failed to leave project: " + error.message);
          renderTeamList(
            currentUserData.teamData,
            currentUserData.isCaptain,
            currentUserData.userId
          );
        }
      });

    promptContainer
      .querySelector(".cancel-leave-btn")
      .addEventListener("click", () => {
        renderTeamList(
          currentUserData.teamData,
          currentUserData.isCaptain,
          currentUserData.userId
        );
      });
  }

  function setupProjectForm() {
    const saveButton = document.getElementById("save-button");
    if (saveButton) {
      saveButton.addEventListener("click", handleSaveProject);
    }

    const shipButton = document.getElementById("ship-button");
    if (shipButton) {
      shipButton.addEventListener("click", () => updateShipStatus(2));
    }

    const unshipButton = document.getElementById("unship-button");
    if (unshipButton) {
      unshipButton.addEventListener("click", () => updateShipStatus(0));
    }

    const dismissNoteButton = document.getElementById("dismiss-note-btn");
    if (dismissNoteButton) {
      dismissNoteButton.addEventListener("click", async () => {
        const token = localStorage.getItem("podium-pro-token");
        const response = await fetch(
          "https://rostrum-d74a4f5f498c.herokuapp.com/api/clear-ship-note",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );
        const data = await response.json();
        if (data.success) {
          currentUserData.projectData.shipNote = data.shipNote;
          renderProjectSection(
            currentUserData.projectData,
            currentUserData.shippingOpen
          );
          pollProjectStatus();
        } else {
          alert("Failed to clear note: " + data.message);
        }
      });
    }

    const copyCodeButton = document.getElementById("copy-code-button");
    if (copyCodeButton) {
      copyCodeButton.addEventListener("click", async () => {
        const projectCode = document.getElementById(
          "project-code-display"
        ).textContent;
        try {
          await navigator.clipboard.writeText(projectCode);
          const originalText = copyCodeButton.textContent;
          copyCodeButton.textContent = "Copied!";
          setTimeout(() => {
            copyCodeButton.textContent = originalText;
          }, 2000);
        } catch (err) {
          console.error("Failed to copy text:", err);
        }
      });
    }
  }

  function setupProjectForms() {
    const joinProjectForm = document.getElementById("join-project-form");
    const createProjectForm = document.getElementById("create-project-form");

    if (joinProjectForm) {
      const projectCodeInput = document.getElementById("project-code-input");
      const joinButton = document.getElementById("join-project-button");
      const joinProjectError = document.getElementById("join-project-error");

      projectCodeInput.addEventListener("input", () => {
        const value = projectCodeInput.value.trim().toUpperCase();
        joinButton.disabled = value.length !== 4;
        joinProjectError.textContent = "";
      });

      joinProjectForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const projectCodeInput = document.getElementById("project-code-input");
        const projectCode = projectCodeInput.value.trim().toUpperCase();
        const token = localStorage.getItem("podium-pro-token");

        const codeRegex = /^[A-Z0-9]{4}$/;
        if (!codeRegex.test(projectCode)) {
          projectCodeInput.classList.add("shake");
          joinProjectError.textContent =
            "Invalid project code. Must be 4 alphanumeric characters.";
          setTimeout(() => projectCodeInput.classList.remove("shake"), 820);
          return;
        }

        joinButton.textContent = "Joining...";
        joinButton.disabled = true;

        try {
          const response = await fetch(
            "https://rostrum-d74a4f5f498c.herokuapp.com/api/join-project-with-code",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, projectCode }),
            }
          );

          const data = await response.json();
          if (!response.ok) {
            joinProjectError.textContent = data.message;
            projectCodeInput.classList.add("shake");
            setTimeout(() => projectCodeInput.classList.remove("shake"), 820);
            throw new Error(data.message);
          }

          pollProjectStatus();
        } catch (error) {
          console.error("Failed to join project:", error.message);
          joinButton.textContent = "Join Project";
          joinButton.disabled = false;
        }
      });
    }

    if (createProjectForm) {
      const projectNameInput = document.getElementById("new-project-name");
      const createButton = document.getElementById("create-project-button");
      const createError = document.getElementById("create-project-error");

      projectNameInput.addEventListener("input", () => {
        createButton.disabled = projectNameInput.value.trim() === "";
        createError.textContent = "";
      });

      createProjectForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const projectName = projectNameInput.value.trim();

        if (projectName === "" || projectName.length > 100) {
          createError.textContent =
            "Project name is required and must be 100 characters or less.";
          projectNameInput.classList.add("shake");
          setTimeout(() => projectNameInput.classList.remove("shake"), 820);
          return;
        }
        createError.textContent = "";

        createButton.textContent = "Creating...";
        createButton.disabled = true;

        const token = localStorage.getItem("podium-pro-token");
        try {
          const response = await fetch(
            "https://rostrum-d74a4f5f498c.herokuapp.com/api/create-project",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, projectName }),
            }
          );
          const data = await response.json();
          if (!response.ok) {
            createError.textContent = data.message;
            projectNameInput.classList.add("shake");
            setTimeout(() => projectNameInput.classList.remove("shake"), 820);
            throw new Error(data.message);
          }
          pollProjectStatus();
        } catch (error) {
          console.error("Failed to create project:", error.message);
          createButton.textContent = "Create Project";
          createButton.disabled = false;
        }
      });
    }
  }

  async function updateShipStatus(newStatus, shouldPoll = true) {
    const latestStatus = currentUserData?.projectData?.status ?? 0;
    if (latestStatus === 3) {
      renderProjectSection(
        currentUserData.projectData,
        currentUserData.shippingOpen,
        currentUserData.isCaptain
      );
      return;
    }

    if (newStatus === 2) {
      if (!validateProjectForm()) {
        alert("Please fill out all required project fields before shipping.");
        return;
      }

      const shipButton = document.getElementById("ship-button");
      if (shipButton) {
        shipButton.textContent = "Saving & Shipping...";
        shipButton.disabled = true;
      }

      const projectData = getProjectDataFromForm();
      const token = localStorage.getItem("podium-pro-token");
      const saveResponse = await fetch(
        "https://rostrum-d74a4f5f498c.herokuapp.com/api/save-project",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, projectData }),
        }
      );
      const saveData = await saveResponse.json();

      if (!saveData.success) {
        alert(
          "Failed to autosave project before shipping: " + saveData.message
        );
        if (shipButton) {
          shipButton.textContent = "Mark as Shipped";
          shipButton.disabled = false;
        }
        return;
      }
    }

    if (newStatus === 0) {
      const unshipButton = document.getElementById("unship-button");
      if (unshipButton) {
        unshipButton.textContent = "Unshipping...";
        unshipButton.disabled = true;
      }
    }

    const token = localStorage.getItem("podium-pro-token");
    const response = await fetch(
      "https://rostrum-d74a4f5f498c.herokuapp.com/api/update-ship-status",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, status: newStatus }),
      }
    );

    const data = await response.json();
    if (data.success) {
      currentUserData.projectData.status = data.status;
      currentUserData.projectData.shipNote = data.shipNote;
      renderProjectSection(
        currentUserData.projectData,
        currentUserData.shippingOpen,
        currentUserData.isCaptain
      );
      if (shouldPoll) {
        pollProjectStatus();
      }
    } else {
      alert("Failed to update shipping status: " + data.message);
    }
  }

  function getProjectDataFromForm() {
    return {
      projectName: document.getElementById("project-name").value,
      description: document.getElementById("project-desc").value,
      demoUrl: document.getElementById("demo-url").value,
      repoUrl: document.getElementById("repo-url").value,
      imageUrl: document.getElementById("image-url").value,
    };
  }

  function validateProjectForm() {
    let isValid = true;
    const urlRegex =
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

    const requirements = {
      demo: currentUserData.eventSettings?.demoUrlRequired,
      repo: currentUserData.eventSettings?.repoUrlRequired,
      image: currentUserData.eventSettings?.imageUrlRequired,
    };

    const MAX_PROJECT_NAME_LENGTH = 100;
    const MAX_DESCRIPTION_LENGTH = 1000;
    const MAX_URL_LENGTH = 200;

    const fields = [
      {
        id: "project-name",
        validator: (val) => val.trim() !== "",
        message: "Project name is required.",
        maxLength: MAX_PROJECT_NAME_LENGTH,
      },
      {
        id: "project-desc",
        validator: (val) => val.trim() !== "",
        message: "Description is required.",
        maxLength: MAX_DESCRIPTION_LENGTH,
      },
      {
        id: "demo-url",
        validator: (val) =>
          !requirements.demo || (val.trim() !== "" && urlRegex.test(val)),
        message: "Please enter a valid URL.",
        maxLength: MAX_URL_LENGTH,
      },
      {
        id: "repo-url",
        validator: (val) =>
          !requirements.repo || (val.trim() !== "" && urlRegex.test(val)),
        message: "Please enter a valid URL.",
        maxLength: MAX_URL_LENGTH,
      },
      {
        id: "image-url",
        validator: (val) =>
          !requirements.image || (val.trim() !== "" && urlRegex.test(val)),
        message: "Please enter a valid URL.",
        maxLength: MAX_URL_LENGTH,
      },
    ];

    fields.forEach((field) => {
      const input = document.getElementById(field.id);
      const errorEl = input?.nextElementSibling;
      let fieldIsValid = true;
      let errorMessage = "";
      const isRequiredField =
        field.id === "project-name" ||
        field.id === "project-desc" ||
        (field.id === "demo-url" && requirements.demo) ||
        (field.id === "repo-url" && requirements.repo) ||
        (field.id === "image-url" && requirements.image);

      if (!input || !errorEl) return;

      if (isRequiredField && !field.validator(input.value)) {
        fieldIsValid = false;
        errorMessage = field.message;
      } else if (input.value.length > field.maxLength) {
        fieldIsValid = false;
        errorMessage = `Max ${field.maxLength} characters.`;
      }

      if (!fieldIsValid) {
        isValid = false;
        errorEl.textContent = errorMessage;
      } else {
        errorEl.textContent = "";
      }
    });
    return isValid;
  }

  function validateProjectFormLengthOnly() {
    let isValid = true;

    const MAX_PROJECT_NAME_LENGTH = 100;
    const MAX_DESCRIPTION_LENGTH = 1000;
    const MAX_URL_LENGTH = 200;

    const fields = [
      { id: "project-name", maxLength: MAX_PROJECT_NAME_LENGTH },
      { id: "project-desc", maxLength: MAX_DESCRIPTION_LENGTH },
      { id: "demo-url", maxLength: MAX_URL_LENGTH },
      { id: "repo-url", maxLength: MAX_URL_LENGTH },
      { id: "image-url", maxLength: MAX_URL_LENGTH },
    ];

    fields.forEach((field) => {
      const input = document.getElementById(field.id);
      const errorEl = input?.nextElementSibling;

      if (!input || !errorEl) return;

      if (input.value.length > field.maxLength) {
        isValid = false;
        errorEl.textContent = `Max ${field.maxLength} characters.`;
      } else {
        errorEl.textContent = "";
      }
    });
    return isValid;
  }

  function setupTeamManagement() {
    const addForm = document.getElementById("add-teammate-form");
    const teamList = document.getElementById("team-list");
    const teamNameForm = document.getElementById("team-name-form");

    const MAX_NAME_LENGTH = 100;
    const MAX_EMAIL_LENGTH = 100;
    const MAX_TEAM_NAME_LENGTH = 100;

    if (addForm) {
      addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById("teammate-name");
        const emailInput = document.getElementById("teammate-email");
        const newTeammate = {
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
        };

        let formIsValid = true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
          !newTeammate.name ||
          newTeammate.name.length === 0 ||
          newTeammate.name.length > MAX_NAME_LENGTH
        ) {
          alert(
            `Teammate name is required and max ${MAX_NAME_LENGTH} characters.`
          );
          formIsValid = false;
        } else if (
          !newTeammate.email ||
          !emailRegex.test(newTeammate.email) ||
          newTeammate.email.length > MAX_EMAIL_LENGTH
        ) {
          alert(
            `Teammate email is required, must be valid, and max ${MAX_EMAIL_LENGTH} characters.`
          );
          formIsValid = false;
        }

        if (!formIsValid) {
          return;
        }

        const token = localStorage.getItem("podium-pro-token");
        const response = await fetch(
          "https://rostrum-d74a4f5f498c.herokuapp.com/api/add-teammate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, teammate: newTeammate }),
          }
        );
        const data = await response.json();
        if (data.success) {
          nameInput.value = "";
          emailInput.value = "";
          pollProjectStatus();
        } else {
          alert("Failed to add teammate: " + data.message);
        }
      });
    }

    if (teamList) {
      teamList.addEventListener("click", async (e) => {
        if (e.target.classList.contains("remove-teammate-btn")) {
          const button = e.target;
          const emailToRemove = button.dataset.email;
          const promptContainer = button.closest(".leave-button-container");
          const originalHtml = promptContainer.innerHTML;

          promptContainer.innerHTML = `
            <span class="text-red-400 text-xs">Are you sure?</span>
            <button type="button" class="bg-red-600 px-2 py-1 text-xs rounded-md confirm-remove-btn">Yes</button>
            <button type="button" class="bg-gray-600 px-2 py-1 text-xs rounded-md cancel-remove-btn">No</button>
          `;

          promptContainer
            .querySelector(".confirm-remove-btn")
            .addEventListener("click", async () => {
              const token = localStorage.getItem("podium-pro-token");
              try {
                const response = await fetch(
                  "https://rostrum-d74a4f5f498c.herokuapp.com/api/remove-teammate",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      token,
                      teammateEmail: emailToRemove,
                    }),
                  }
                );
                const data = await response.json();
                if (data.success) {
                  pollProjectStatus();
                } else {
                  alert("Failed to remove teammate: " + data.message);
                  promptContainer.innerHTML = originalHtml;
                }
              } catch (error) {
                alert("Failed to remove teammate: " + error.message);
                promptContainer.innerHTML = originalHtml;
              }
            });

          promptContainer
            .querySelector(".cancel-remove-btn")
            .addEventListener("click", () => {
              promptContainer.innerHTML = originalHtml;
            });
        } else if (e.target.classList.contains("leave-team-btn")) {
          const button = e.target;
          handleLeaveProject(button);
        }
      });
    }

    if (teamNameForm) {
      teamNameForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const teamNameInput = document.getElementById("team-name-input");
        const teamName = teamNameInput.value.trim();
        const saveButton = teamNameForm.querySelector("button");

        if (
          !teamName ||
          teamName.length === 0 ||
          teamName.length > MAX_TEAM_NAME_LENGTH
        ) {
          alert(
            `Team name is required and max ${MAX_TEAM_NAME_LENGTH} characters.`
          );
          return;
        }

        const token = localStorage.getItem("podium-pro-token");
        saveButton.textContent = "Saving...";
        const response = await fetch(
          "https://rostrum-d74a4f5f498c.herokuapp.com/api/save-team-name",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, teamName }),
          }
        );
        const data = await response.json();
        if (data.success) {
          saveButton.textContent = "Saved!";
        } else {
          alert("Failed to save team name: " + data.message);
          saveButton.textContent = "Error!";
        }
        setTimeout(() => {
          saveButton.textContent = "Save";
        }, 2000);
        pollProjectStatus();
      });
    }
  }

  // --- VOTING PORTAL FUNCTIONS ---

  function renderVotingPortal(userData) {
    const votesRemaining = userData.voteLimit - userData.votesCast;
    dashboardContent.innerHTML = `
        <div class="max-w-6xl mx-auto text-center px-4">
            <h2 class="text-3xl font-bold text-white">Voting is Open!</h2>
            <p class="text-gray-400 mt-2">Move the slider to indicate which project you think is better and by how much.</p>
            <p id="votes-remaining-display" class="text-lg font-semibold text-indigo-400 mt-4">Votes Remaining: ${votesRemaining}</p>
            <div id="matchup-container" class="mt-8">
                <!-- Matchup will be loaded here -->
            </div>
        </div>
    `;
    fetchAndRenderMatchup();
  }

  async function fetchAndRenderMatchup() {
    const matchupContainer = document.getElementById("matchup-container");
    matchupContainer.innerHTML = `<p class="text-lg text-indigo-400">Finding the next matchup...</p>`;
    const token = localStorage.getItem("podium-pro-token");

    try {
      const response = await fetch(
        "https://rostrum-d74a4f5f498c.herokuapp.com/api/get-next-matchup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }

      if (data.matchup) {
        renderMatchup(data.matchup[0], data.matchup[1]);
      } else {
        matchupContainer.innerHTML = `<p class="text-lg text-green-400">${
          data.message || "No more matchups available. You're all done!"
        }</p>`;
      }
    } catch (error) {
      matchupContainer.innerHTML = `<p class="text-red-400">Error fetching matchup: ${error.message}</p>`;
    }
  }

  function renderMatchup(projectA, projectB) {
    const matchupContainer = document.getElementById("matchup-container");

    const getTeamMembers = (project) => {
      if (!project.teamMembers || project.teamMembers.length === 0) {
        return "<span>Unknown Team</span>";
      }
      return project.teamMembers
        .map((m) => `${m.name}${m.isCaptain ? " (PM)" : ""}`)
        .join(", ");
    };

    const createProjectCard = (project) => {
      const teamMembers = getTeamMembers(project);

      return `
        <div class="bg-gray-800/50 rounded-2xl p-6 flex flex-col h-full text-left">
            ${
              project.imageUrl
                ? `<img src="${project.imageUrl}" onerror="this.style.display='none'" class="w-full h-48 object-cover rounded-lg mb-4" alt="Project Image">`
                : ""
            }
            <h3 class="text-2xl font-bold text-white mb-1">${
              project.projectName
            }</h3>
            <p class="text-sm text-gray-400 mb-3">Team: ${teamMembers}</p>
            <p class="text-gray-300 flex-grow mb-4">${project.description}</p>
            <div class="mt-auto pt-4 border-t border-gray-700 flex items-center gap-4 flex-wrap">
                ${
                  project.demoUrl
                    ? `<a href="${project.demoUrl}" target="_blank" class="bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 transition text-sm">Demo</a>`
                    : ""
                }
                ${
                  project.repoUrl
                    ? `<a href="${project.repoUrl}" target="_blank" class="bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 transition text-sm">Repo</a>`
                    : ""
                }
            </div>
        </div>
      `;
    };

    matchupContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            ${createProjectCard(projectA)}
            ${createProjectCard(projectB)}
        </div>
        <div class="mt-8 max-w-2xl mx-auto">
            <div class="flex justify-between items-center text-white font-bold text-lg mb-2 px-2">
                <span class="text-left">${
                  projectA.projectName
                } is WAY better</span>
                <span class="text-right">${
                  projectB.projectName
                } is WAY better</span>
            </div>
            <input id="vote-slider" type="range" min="-100" max="100" value="0" class="w-full vote-slider">
            <div class="text-center mt-4">
                <span id="slider-value-display" class="text-gray-400 font-semibold text-lg">Move the slider to vote</span>
            </div>
        </div>
        <div class="mt-6 flex justify-center items-center gap-4">
            <button id="tie-vote-btn" class="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition text-lg">
                Tie Matchup
            </button>
            <button id="submit-vote-btn" class="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition text-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                Submit Vote
            </button>
        </div>
    `;

    const slider = document.getElementById("vote-slider");
    const display = document.getElementById("slider-value-display");
    const submitBtn = document.getElementById("submit-vote-btn");
    const tieBtn = document.getElementById("tie-vote-btn");

    slider.addEventListener("input", () => {
      const value = parseInt(slider.value, 10);
      submitBtn.disabled = value === 0;
      if (value < 0) {
        display.textContent = `${Math.abs(value)}% towards ${
          projectA.projectName
        }`;
      } else if (value > 0) {
        display.textContent = `${value}% towards ${projectB.projectName}`;
      } else {
        display.textContent = "Move the slider to vote";
      }
    });

    submitBtn.addEventListener("click", () => {
      const sliderValue = parseInt(slider.value, 10);
      handleVote(sliderValue, [projectA.projectCode, projectB.projectCode]);
    });

    tieBtn.addEventListener("click", () => {
      handleTie([projectA.projectCode, projectB.projectCode]);
    });
  }

  async function handleVote(sliderValue, matchup) {
    const matchupContainer = document.getElementById("matchup-container");
    matchupContainer.innerHTML = `<p class="text-lg text-indigo-400">Submitting your vote...</p>`;
    const token = localStorage.getItem("podium-pro-token");

    try {
      const response = await fetch(
        "https://rostrum-d74a4f5f498c.herokuapp.com/api/submit-vote",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, sliderValue, matchup }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
      currentUserData.votesCast++;
      const votesRemaining =
        currentUserData.voteLimit - currentUserData.votesCast;
      const votesDisplay = document.getElementById("votes-remaining-display");
      if (votesDisplay) {
        votesDisplay.textContent = `Votes Remaining: ${votesRemaining}`;
      }
      fetchAndRenderMatchup();
    } catch (error) {
      matchupContainer.innerHTML = `<p class="text-red-400">Error submitting vote: ${error.message}</p>`;
    }
  }

  async function handleTie(matchup) {
    const matchupContainer = document.getElementById("matchup-container");
    matchupContainer.innerHTML = `<p class="text-lg text-indigo-400">Recording the tie...</p>`;
    const token = localStorage.getItem("podium-pro-token");

    try {
      const response = await fetch(
        "https://rostrum-d74a4f5f498c.herokuapp.com/api/submit-tie",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, matchup }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
      currentUserData.votesCast++;
      const votesRemaining =
        currentUserData.voteLimit - currentUserData.votesCast;
      const votesDisplay = document.getElementById("votes-remaining-display");
      if (votesDisplay) {
        votesDisplay.textContent = `Votes Remaining: ${votesRemaining}`;
      }
      fetchAndRenderMatchup();
    } catch (error) {
      matchupContainer.innerHTML = `<p class="text-red-400">Error submitting tie: ${error.message}</p>`;
    }
  }

  // --- GENERAL LISTENERS ---

  logoutButton.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("podium-pro-token");
    lastKnownToken = null;
    window.location.href = PODIUM_PRO_MAIN_PAGE_PATH;
  });

  window.addEventListener("storage", (event) => {
    if (event.key === "podium-pro-token") {
      const newToken = event.newValue;
      if (
        !newToken ||
        (newToken !== lastKnownToken && lastKnownToken !== null)
      ) {
        console.warn(
          "localStorage token changed by another tab. Redirecting this tab."
        );
        alert("Your session has changed in another tab. Redirecting to login.");
        clearInterval(statusPollInterval);
        window.location.href = PODIUM_PRO_MAIN_PAGE_PATH;
      }
    }
  });

  verifyTokenAndRender();
});
