// organizer.js

document.addEventListener("DOMContentLoaded", () => {
  const organizerMainContent = document.getElementById(
    "organizer-main-content"
  );
  let lastKnownToken = null;
  let currentOrganizerData = null;
  let currentEventDetails = null;

  // Utility function to escape HTML to prevent XSS
  const escapeHtml = (unsafe) => {
    return unsafe
      ? unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      : "";
  };

  // --- Page Rendering Functions ---
  const renderLoginState = () => {
    organizerMainContent.innerHTML = `
      <div class="max-w-lg mx-auto text-center">
        <h2 class="text-3xl font-bold text-white">Organizer Portal</h2>
        <p class="text-gray-400 mt-2">Log in with your name and email to manage your events.</p>
        <div class="mt-8">
            <div class="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                <input id="full-name-input" type="text" placeholder="Full Name" class="dark-input w-full text-center text-lg px-4 py-3 rounded-md border transition focus:ring-2 focus:ring-indigo-500">
                <div class="w-full">
                    <input id="email-input" type="email" placeholder="Email Address" class="dark-input w-full text-center text-lg px-4 py-3 rounded-md border transition focus:ring-2 focus:ring-indigo-500">
                    <p id="error-message" class="text-sm text-left mt-1 h-4 text-red-400"></p>
                </div>
                <button id="get-magic-link-button" class="bg-indigo-600 text-white w-full px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition text-lg">
                    Get Magic Link
                </button>
            </div>
        </div>
      </div>
    `;
    setupLoginListeners();
  };

  const renderSentState = (email) => {
    organizerMainContent.innerHTML = `
      <div class="max-w-lg mx-auto text-center">
        <h2 class="text-3xl font-bold text-white">Check Your Inbox!</h2>
        <p class="text-gray-400 mt-2">A magic link has been sent to <strong>${escapeHtml(
          email
        )}</strong>.</p>
        <p class="text-sm text-gray-500 mt-4">Click the link in the email to log in to the organizer portal.</p>
        <p class="text-xs text-gray-600 mt-2">(Check your spam folder -- there's a high chance it's in there!)</p>
      </div>
    `;
  };

  const renderDashboardState = () => {
    organizerMainContent.innerHTML = `
      <div class="max-w-4xl mx-auto text-left">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-bold text-white">Hello, ${escapeHtml(
            currentOrganizerData.name
          )}!</h2>
          <button
            id="logout-button"
            class="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-bold text-white">Your Events</h3>
          <button id="create-event-button" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition">
            + Create New Event
          </button>
        </div>
        <div id="events-list" class="space-y-4">
          ${
            currentOrganizerData.events.length > 0
              ? currentOrganizerData.events
                  .map(
                    (event) => `
            <div class="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p class="font-semibold text-white text-xl">${escapeHtml(
                  event.eventName
                )}</p>
                <p class="text-gray-400 text-sm">Event Code: ${escapeHtml(
                  event.eventCode
                )}</p>
              </div>
              <button class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition manage-event-button" data-event-code="${escapeHtml(
                event.eventCode
              )}">Manage</button>
            </div>
          `
                  )
                  .join("")
              : '<p class="text-gray-400 text-center">You don\'t have any events yet. Click "Create New Event" to get started!</p>'
          }
        </div>
        <div id="create-event-form" class="hidden bg-gray-800/50 rounded-2xl p-8 mt-10">
          <h3 class="text-2xl font-bold text-white mb-4">Create a New Event</h3>
          <form id="new-event-form" class="space-y-4">
            <div>
              <label for="event-name-input" class="block text-m font-medium text-gray-400">Event Name</label>
              <input type="text" id="event-name-input" placeholder="e.g., Spring Hackathon 2026" maxlength="100" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2">
              <p class="text-red-400 text-xs mt-1 h-4 error-message" id="event-name-error"></p>
            </div>
            <div>
              <label for="event-desc-input" class="block text-m font-medium text-gray-400">Description</label>
              <textarea id="event-desc-input" rows="3" placeholder="A short, compelling description of your hackathon." maxlength="1000" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2"></textarea>
              <p class="text-red-400 text-xs mt-1 h-4 error-message" id="event-desc-error"></p>
            </div>
            <div>
              <label class="block text-m font-medium text-gray-400">Other Organizer Emails</label>
              <div class="flex items-center gap-2 mt-1">
                <input type="email" id="organizer-email-input" placeholder="e.g., jane.doe@example.com" class="dark-input flex-grow rounded-md shadow-sm text-lg p-2">
                <button type="button" id="add-organizer-button" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition">Add</button>
              </div>
              <p id="organizer-email-error" class="text-red-400 text-xs mt-1 h-4"></p>
              <div id="organizers-list" class="mt-2 space-y-2"></div>
            </div>
            <div class="flex justify-end gap-4 mt-6">
              <button type="button" id="cancel-create-event" class="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition text-lg">Cancel</button>
              <button type="submit" id="save-event-button" class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition text-lg">Create Event</button>
            </div>
          </form>
        </div>
      </div>
    `;
    setupDashboardListeners();
  };

  const renderManageEventState = (event) => {
    currentEventDetails = event;

    const navTabs = `
      <div class="flex border-b border-gray-700 mb-6 overflow-x-auto">
          <button id="tab-details" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-white hover:border-indigo-500 transition-colors duration-200 flex-shrink-0">Details</button>
          <button id="tab-organizers" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-white hover:border-indigo-500 transition-colors duration-200 flex-shrink-0">Organizers</button>
          <button id="tab-projects" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-white hover:border-indigo-500 transition-colors duration-200 flex-shrink-0">Projects</button>
          <button id="tab-voting" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-white hover:border-indigo-500 transition-colors duration-200 flex-shrink-0">Voting Results</button>
          <button id="tab-awards" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-white hover:border-indigo-500 transition-colors duration-200 flex-shrink-0">Awards</button>
          <button id="tab-attendees" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-white hover:border-indigo-500 transition-colors duration-200 flex-shrink-0">Attendees</button>
          <button id="tab-bans" class="px-4 py-2 text-sm font-bold border-b-2 border-transparent text-red-500 hover:text-red-300 hover:border-red-500 transition-colors duration-200 flex-shrink-0">Bans</button>
          <button id="tab-danger-zone" class="px-4 py-2 text-sm font-bold border-b-2 border-transparent text-red-500 hover:text-red-300 hover:border-red-500 transition-colors duration-200 flex-shrink-0">Danger Zone</button>
      </div>
    `;

    organizerMainContent.innerHTML = `
        <div class="max-w-4xl mx-auto text-left">
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center space-x-4">
              <button id="back-to-dashboard-button" class="text-gray-400 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h2 class="text-3xl font-bold text-white">Manage: ${escapeHtml(
                event.eventName
              )}</h2>
              <button id="refresh-button" class="text-indigo-400 hover:text-indigo-300 transition-colors duration-200 text-sm font-semibold ml-4">
<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2.134m15.357 2H15" />
</svg>
                Refresh
              </button>
            </div>
            <button
              id="logout-button-manage"
              class="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
          ${navTabs}
          <div id="event-content"></div>
        </div>
      `;

    // Set up tabs and show default content
    setupManageEventListeners();
    document.getElementById("tab-details").click();
  };

  const renderDetailsPage = () => {
    const contentDiv = document.getElementById("event-content");
    if (!contentDiv) return;

    const event = currentEventDetails;
    const originalEventDetails = {
      eventName: event.eventName,
      description: event.description,
      votingOpen: event.votingOpen,
      shippingOpen: event.shippingOpen,
      demoUrlRequired: event.demoUrlRequired,
      repoUrlRequired: event.repoUrlRequired,
      imageUrlRequired: event.imageUrlRequired,
    };

    contentDiv.innerHTML = `
        <div class="space-y-8">
            <div id="event-settings" class="bg-gray-800/50 rounded-2xl p-8">
              <h3 class="text-2xl font-bold text-white mb-4">Event Details</h3>
              <form id="event-details-form" class="space-y-4">
                  <div>
                    <label for="event-name-edit" class="block text-m font-medium text-gray-400">Event Name</label>
                    <input type="text" id="event-name-edit" value="${escapeHtml(
                      event.eventName
                    )}" maxlength="100" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2">
                    <p class="text-red-400 text-xs mt-1 h-4 error-message" id="event-name-edit-error"></p>
                  </div>
                  <div>
                    <label for="event-desc-edit" class="block text-m font-medium text-gray-400">Description</label>
                    <textarea id="event-desc-edit" rows="5" maxlength="1000" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2">${escapeHtml(
                      event.description
                    )}</textarea>
                    <p class="text-red-400 text-xs mt-1 h-4 error-message" id="event-desc-edit-error"></p>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p class="block text-m font-medium text-gray-400 mb-2">Voting Status</p>
                      <div class="flex items-center">
                        <span id="voting-status-text" class="text-white font-semibold mr-4">${
                          event.votingOpen ? "Open" : "Closed"
                        }</span>
                        <label class="inline-flex relative items-center cursor-pointer">
                            <input type="checkbox" id="voting-status-toggle" class="sr-only peer" ${
                              event.votingOpen ? "checked" : ""
                            }>
                            <div class="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                    <div>
                      <p class="block text-m font-medium text-gray-400 mb-2">Shipping Status</p>
                      <div class="flex items-center">
                        <span id="shipping-status-text" class="text-white font-semibold mr-4">${
                          event.shippingOpen ? "Open" : "Closed"
                        }</span>
                        <label class="inline-flex relative items-center cursor-pointer">
                            <input type="checkbox" id="shipping-status-toggle" class="sr-only peer" ${
                              event.shippingOpen ? "checked" : ""
                            }>
                            <div class="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="pt-4 border-t border-gray-700">
                    <p class="block text-lg font-bold text-white mb-2">Project Field Requirements</p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="flex items-center justify-between">
                            <span class="text-white font-semibold">Demo URL Required</span>
                            <label class="inline-flex relative items-center cursor-pointer">
                                <input type="checkbox" id="demo-url-required-toggle" class="sr-only peer" ${
                                  event.demoUrlRequired !== false
                                    ? "checked"
                                    : ""
                                }>
                                <div class="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-white font-semibold">Repo URL Required</span>
                            <label class="inline-flex relative items-center cursor-pointer">
                                <input type="checkbox" id="repo-url-required-toggle" class="sr-only peer" ${
                                  event.repoUrlRequired ? "checked" : ""
                                }>
                                <div class="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-white font-semibold">Image URL Required</span>
                            <label class="inline-flex relative items-center cursor-pointer">
                                <input type="checkbox" id="image-url-required-toggle" class="sr-only peer" ${
                                  event.imageUrlRequired ? "checked" : ""
                                }>
                                <div class="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                  </div>
                  <div class="text-right flex justify-end items-center gap-4 pt-4">
                    <p id="save-details-message" class="text-sm text-yellow-500"></p>
                    <button type="submit" id="save-event-details-button" class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition">Save Details</button>
                  </div>
              </form>
              <div class="mt-8 pt-8 border-t border-gray-700">
                <h3 class="text-2xl font-bold text-white mb-4">Invite Attendees</h3>
                <p class="text-lg font-semibold text-gray-200 mb-4">Tell attendees to go to <a href="https://eddyzow.net/podium" target="_blank" class="text-indigo-400 hover:underline">eddyzow.net/podium</a> and enter this code:</p>
                <div class="bg-gray-900/50 rounded-md p-4 flex items-center justify-between">
                    <p id="event-code-display" class="font-mono text-xl text-white">${escapeHtml(
                      event.eventCode
                    )}</p>
                    <button id="copy-code-button" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition">Copy Code</button>
                </div>
                <p class="text-sm text-gray-500 mt-4 italic">Note: Only one attendee per team needs to create a project. Team members can be added later from the attendee dashboard.</p>
              </div>
            </div>
        </div>
      `;
    setupDetailsEventListeners(originalEventDetails);
  };

  const renderOrganizersPage = () => {
    const contentDiv = document.getElementById("event-content");
    if (!contentDiv) return;

    const event = currentEventDetails;
    const creatorUserId =
      event.organizers.length > 0 ? event.organizers[0].userId : null;
    const canAddRemoveOrganizers =
      currentEventDetails.organizers.find(
        (org) => org.userId === currentOrganizerData.userId
      )?.permissionLevel >= 2;
    const canPromoteDemote =
      currentEventDetails.organizers.find(
        (org) => org.userId === currentOrganizerData.userId
      )?.permissionLevel === 3;

    const addOrganizerForm = `
      <div class="flex items-center gap-2 mb-2">
        <input type="email" id="add-organizer-email-input" placeholder="Add new organizer email" class="dark-input flex-grow rounded-md shadow-sm text-lg p-2">
        <button type="button" id="add-organizer-email-button" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition">Add</button>
      </div>
      <p id="add-organizer-error" class="text-red-400 text-xs h-4 mb-2"></p>
    `;

    const listHtml = (currentEventDetails.organizers || [])
      .map((org) => {
        const isUserTheCreator = org.userId === creatorUserId;
        const isCurrentUser = org.userId === currentOrganizerData.userId;

        const roleText = isUserTheCreator
          ? "Creator"
          : org.permissionLevel === 2
          ? "Lead Organizer"
          : "Organizer";

        const permissionSelect =
          canPromoteDemote && !isUserTheCreator
            ? `<select data-email="${escapeHtml(
                org.email
              )}" class="dark-input p-1 rounded-md text-sm permission-selector">
                <option value="1" ${
                  org.permissionLevel === 1 ? "selected" : ""
                }>Organizer</option>
                <option value="2" ${
                  org.permissionLevel === 2 ? "selected" : ""
                }>Lead Organizer</option>
            </select>`
            : "";

        return `
              <div class="flex items-center justify-between p-2 rounded-md bg-gray-900/50 organizer-list-item" data-email="${escapeHtml(
                org.email
              )}">
                <div class="flex flex-col">
                  <p>${escapeHtml(org.name)} (${escapeHtml(org.email)})</p>
                  <span class="text-xs text-gray-500">${
                    isCurrentUser ? "You" : ""
                  } ${roleText}</span>
                </div>
                <div class="flex items-center gap-2">
                  ${permissionSelect}
                  ${
                    canAddRemoveOrganizers && !isUserTheCreator
                      ? `<div class="remove-organizer-prompt-container">
                           <button type="button" class="bg-red-600/50 text-red-300 hover:bg-red-500/50 px-3 py-1 text-sm rounded-md transition remove-organizer-btn" data-email="${escapeHtml(
                             org.email
                           )}">Remove</button>
                         </div>`
                      : ""
                  }
                </div>
              </div>
            `;
      })
      .join("");

    contentDiv.innerHTML = `
      <div id="organizer-list-section" class="bg-gray-800/50 rounded-2xl p-8">
        <h3 class="text-2xl font-bold text-white mb-4">Event Organizers</h3>
        ${canAddRemoveOrganizers ? addOrganizerForm : ""}
        <div id="manage-organizers-list" class="space-y-2">
          ${listHtml}
        </div>
      </div>
    `;

    setupOrganizersEventListeners();
  };

  const renderProjectsPage = () => {
    const contentDiv = document.getElementById("event-content");
    if (!contentDiv) return;

    const event = currentEventDetails;
    const sortedProjects = [...(event.projects || [])].sort(
      (a, b) => a.status - b.status
    );
    const canEditProjects =
      currentEventDetails.organizers.find(
        (org) => org.userId === currentOrganizerData.userId
      )?.permissionLevel >= 1;

    contentDiv.innerHTML = `
        <div id="projects-attendees" class="bg-gray-800/50 rounded-2xl p-8">
            <h3 class="text-2xl font-bold text-white mb-4">Projects</h3>
            <input type="text" id="project-search-input" placeholder="Search projects by name, project manager, or team members..." class="dark-input w-full rounded-md shadow-sm text-lg p-2 mb-4">
            <div id="project-list-container" class="space-y-4">
                ${
                  (event.projects || []).length > 0
                    ? sortedProjects
                        .map((project) => {
                          const projectSubmitter = (event.attendees || []).find(
                            (a) => a.userId === project.submittedBy
                          );

                          const teamName =
                            projectSubmitter?.teamName ||
                            project.projectName ||
                            "Unknown Team";

                          const statusMap = {
                            0: { text: "Not Shipped", class: "bg-red-800" },
                            1: {
                              text: "Needs Attention",
                              class: "bg-yellow-800",
                            },
                            2: {
                              text: "Shipped - Needs Review",
                              class: "bg-yellow-600",
                            },
                            3: {
                              text: "Shipped - Approved",
                              class: "bg-green-800",
                            },
                          };
                          const currentStatus = statusMap[project.status];

                          const teamMembersHtml = `
                              <div class="mt-4 p-4 bg-gray-700/50 rounded-md">
                                  <p class="font-semibold text-white mb-2">Team Members:</p>
                                  <ul class="text-sm text-gray-400 space-y-1 team-members-list">
                                      <li>${escapeHtml(
                                        projectSubmitter?.name || "Unknown"
                                      )} (${escapeHtml(
                            projectSubmitter?.email || "Unknown"
                          )}) - Project Manager</li>
                                      ${(project.otherTeamMembers || [])
                                        .map(
                                          (member) =>
                                            `<li>${escapeHtml(
                                              member.name
                                            )} (${escapeHtml(
                                              member.email
                                            )})</li>`
                                        )
                                        .join("")}
                                  </ul>
                              </div>
                          `;

                          const statusSectionHTML =
                            project.status === 2
                              ? `
                                <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                    <button data-user-id="${escapeHtml(
                                      project.submittedBy
                                    )}" class="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition approve-button">Approve</button>
                                    <button data-user-id="${escapeHtml(
                                      project.submittedBy
                                    )}" class="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition reject-button">Reject</button>
                                </div>
                                <div class="reject-note-container hidden mt-4">
                                    <p class="text-sm text-gray-400 mb-2">Please provide feedback to the team:</p>
                                    <textarea rows="3" data-user-id="${escapeHtml(
                                      project.submittedBy
                                    )}" placeholder="Add note for team explaining rejection..." class="dark-input w-full p-2 rounded-md reject-note-input"></textarea>
                                    <button data-user-id="${escapeHtml(
                                      project.submittedBy
                                    )}" class="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition submit-reject-note-button">Reject & Submit Note</button>
                                </div>
                                <div class="border-t border-gray-600 pt-4 mt-4">
                                    <p class="text-sm text-gray-400 mb-2">Manual Status Change:</p>
                                    <div class="flex flex-col gap-2">
                                        <select data-user-id="${escapeHtml(
                                          project.submittedBy
                                        )}" class="dark-input flex-grow p-2 rounded-md status-selector">
                                            <option value="0" ${
                                              project.status === 0
                                                ? "selected"
                                                : ""
                                            }>Not Shipped</option>
                                            <option value="1" ${
                                              project.status === 1
                                                ? "selected"
                                                : ""
                                            }>Needs Attention</option>
                                            <option value="2" ${
                                              project.status === 2
                                                ? "selected"
                                                : ""
                                            }>Shipped - Needs Review</option>
                                            <option value="3" ${
                                              project.status === 3
                                                ? "selected"
                                                : ""
                                            }>Shipped - Approved</option>
                                        </select>
                                        <textarea rows="1" data-user-id="${escapeHtml(
                                          project.submittedBy
                                        )}" placeholder="Add note to team..." class="dark-input w-full p-2 rounded-md status-note-input">${escapeHtml(
                                  project.shipNote
                                )}</textarea>
                                        <div class="flex justify-end">
                                            <button data-user-id="${escapeHtml(
                                              project.submittedBy
                                            )}" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition save-status-button">Save</button>
                                        </div>
                                    </div>
                                </div>
                                `
                              : `
                                <p class="text-sm text-gray-400 mb-2">Manual Status Change:</p>
                                <div class="flex flex-col gap-2">
                                    <select data-user-id="${escapeHtml(
                                      project.submittedBy
                                    )}" class="dark-input flex-grow p-2 rounded-md status-selector">
                                        <option value="0" ${
                                          project.status === 0 ? "selected" : ""
                                        }>Not Shipped</option>
                                        <option value="1" ${
                                          project.status === 1 ? "selected" : ""
                                        }>Needs Attention</option>
                                        <option value="2" ${
                                          project.status === 2 ? "selected" : ""
                                        }>Shipped - Needs Review</option>
                                        <option value="3" ${
                                          project.status === 3 ? "selected" : ""
                                        }>Shipped - Approved</option>
                                    </select>
                                    <textarea rows="1" data-user-id="${escapeHtml(
                                      project.submittedBy
                                    )}" placeholder="Add note to team..." class="dark-input w-full p-2 rounded-md status-note-input">${escapeHtml(
                                  project.shipNote
                                )}</textarea>
                                    <div class="flex justify-end">
                                        <button data-user-id="${escapeHtml(
                                          project.submittedBy
                                        )}" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition save-status-button">Save</button>
                                    </div>
                                </div>
                                `;

                          return `
                    <div class="bg-gray-900 p-4 rounded-lg project-card" data-user-id="${escapeHtml(
                      project.submittedBy
                    )}">
                      <details class="group">
                        <summary class="flex justify-between items-start text-white text-xl font-bold cursor-pointer">
                           <div class="flex flex-col">
                              <span>${escapeHtml(teamName)}</span>
                              <span class="text-sm text-gray-400 font-normal">Project: ${escapeHtml(
                                project.projectName
                              )}</span>
                           </div>
                           <div class="flex items-center space-x-2 mt-2 md:mt-0">
                             <span class="px-3 py-1 text-sm font-semibold text-white rounded-full ${
                               currentStatus.class
                             } status-indicator-badge">${
                            currentStatus.text
                          }</span>
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transform transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                             </svg>
                           </div>
                        </summary>
                        <div class="mt-4">
                            <div class="project-view-mode">
                                <p class="text-gray-400 mb-2">${escapeHtml(
                                  project.description
                                )}</p>
<div class="mt-4 flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0">
    <a href="${escapeHtml(
      project.demoUrl
    )}" target="_blank" class="text-indigo-400 hover:underline">Demo</a>
    ${
      project.repoUrl
        ? `<a href="${escapeHtml(
            project.repoUrl
          )}" target="_blank" class="text-indigo-400 hover:underline">Repo</a>`
        : ""
    }
    ${
      project.imageUrl
        ? `<a href="${escapeHtml(
            project.imageUrl
          )}" target="_blank" class="text-indigo-400 hover:underline">Image</a>`
        : ""
    }
</div>
                                <div class="mt-4">
                                  <p class="font-semibold text-white">Project Code: ${escapeHtml(
                                    project.projectCode
                                  )}</p>
                                </div>
                                ${
                                  canEditProjects
                                    ? `<button type="button" class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm edit-project-button">Edit Project</button>`
                                    : ""
                                }
                            </div>
                            
                            <div class="project-edit-mode hidden">
                                <form class="project-edit-form space-y-4" data-user-id="${escapeHtml(
                                  project.submittedBy
                                )}">
                                    <div>
                                        <label for="project-name-${
                                          project.submittedBy
                                        }" class="block text-sm font-medium text-gray-400">Project Name</label>
                                        <input type="text" id="project-name-${
                                          project.submittedBy
                                        }" value="${escapeHtml(
                            project.projectName
                          )}" class="dark-input mt-1 block w-full text-lg p-2">
                                    </div>
                                    <div>
                                        <label for="project-desc-${
                                          project.submittedBy
                                        }" class="block text-sm font-medium text-gray-400">Description</label>
                                        <textarea id="project-desc-${
                                          project.submittedBy
                                        }" rows="3" class="dark-input mt-1 block w-full text-lg p-2">${escapeHtml(
                            project.description
                          )}</textarea>
                                    </div>
                                    <div>
                                        <label for="demo-url-${
                                          project.submittedBy
                                        }" class="block text-sm font-medium text-gray-400">Demo URL</label>
                                        <input type="text" id="demo-url-${
                                          project.submittedBy
                                        }" value="${escapeHtml(
                            project.demoUrl
                          )}" class="dark-input mt-1 block w-full text-lg p-2">
                                    </div>
                                    <div>
                                        <label for="repo-url-${
                                          project.submittedBy
                                        }" class="block text-sm font-medium text-gray-400">Repo URL</label>
                                        <input type="text" id="repo-url-${
                                          project.submittedBy
                                        }" value="${escapeHtml(
                            project.repoUrl
                          )}" class="dark-input mt-1 block w-full text-lg p-2">
                                    </div>
                                    <div>
                                        <label for="image-url-${
                                          project.submittedBy
                                        }" class="block text-sm font-medium text-gray-400">Image URL</label>
                                        <input type="text" id="image-url-${
                                          project.submittedBy
                                        }" value="${escapeHtml(
                            project.imageUrl
                          )}" class="dark-input mt-1 block w-full text-lg p-2">
                                    </div>
                                    <div class="mt-4 flex justify-end gap-2">
                                        <button type="button" class="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition cancel-edit-button">Cancel</button>
                                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition save-project-button">Save</button>
                                    </div>
                                </form>
                            </div>
                            
                            <div class="mt-4 p-4 rounded-md bg-gray-700/50 manage-status-box">
                                <p class="font-semibold text-white mb-2">Manage Project Status:</p>
                                ${statusSectionHTML}
                            </div>
                            ${teamMembersHtml}
                        </div>
                      </details>
                    </div>
                  `;
                        })
                        .join("")
                    : `<p class="text-gray-400 text-center">No projects have been submitted yet. To receive project submissions, shipping must be open.</p>`
                }
            </div>
        </div>
    `;
    setupProjectsEventListeners();
  };

  const renderVotingResultsPage = async () => {
    const contentDiv = document.getElementById("event-content");
    if (!contentDiv) return;

    contentDiv.innerHTML = `<div class="text-center p-8"><p class="text-white">Loading voting results...</p></div>`;

    try {
      const token = localStorage.getItem("podium-pro-organizer-token");
      const response = await fetch(
        "https://podium-d74a4f5f498c.herokuapp.com/api/get-voting-results",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            eventCode: currentEventDetails.eventCode,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch results.");
      }

      const { results } = data;
      const {
        projects,
        voterLeaderboard,
        bannedVoters,
        totalVotes,
        confidence,
      } = results;

      const getRankClass = (rank) => {
        if (rank === 1) return "bg-yellow-500/30";
        if (rank === 2) return "bg-gray-400/30";
        if (rank === 3) return "bg-yellow-800/30";
        if (rank <= 10) return "bg-blue-800/30";
        return "";
      };

      const rankingsHtml =
        projects.length > 0
          ? projects
              .map(
                (p, index) => `
                <tr class="border-b border-gray-700 hover:bg-gray-800/50 ${getRankClass(
                  index + 1
                )}">
                    <td class="p-3 text-center">${index + 1}</td>
                    <td class="p-3 font-semibold">${escapeHtml(
                      p.projectName
                    )}</td>
                    <td class="p-3 text-center font-mono">${Math.round(
                      p.eloScore
                    )}</td>
                    <td class="p-3 text-center">${p.timesVoted}</td>
                    <td class="p-3 text-center font-mono">${
                      p.avgWinMargin
                    }%</td>
                    <td class="p-3 text-center font-semibold ${
                      p.confidence > 75
                        ? "text-green-400"
                        : p.confidence > 50
                        ? "text-yellow-400"
                        : "text-red-400"
                    }">${p.confidence}%</td>
                </tr>`
              )
              .join("")
          : `<tr><td colspan="6" class="text-center p-4 text-gray-400">No approved projects to display.</td></tr>`;

      const voterLeaderboardHtml =
        voterLeaderboard.length > 0
          ? voterLeaderboard
              .map(
                (voter, index) => `
                <tr class="border-b border-gray-700 hover:bg-gray-800/50">
                    <td class="p-3 text-center">${index + 1}</td>
                    <td class="p-3 font-semibold">${escapeHtml(voter.name)}</td>
                    <td class="p-3">${escapeHtml(voter.email)}</td>
                    <td class="p-3 text-center">${voter.count}</td>
                    <td class="p-3 text-center">
                        <div class="flex justify-center gap-2">
                           <button class="bg-red-600 text-white px-2 py-1 text-xs rounded-md hover:bg-red-700 ban-voter-btn" data-user-id="${
                             voter.userId
                           }">Ban</button>
                           <button class="bg-yellow-600 text-black px-2 py-1 text-xs rounded-md hover:bg-yellow-700 erase-votes-btn" data-user-id="${
                             voter.userId
                           }">Erase Votes</button>
                        </div>
                    </td>
                </tr>`
              )
              .join("")
          : `<tr><td colspan="5" class="text-center p-4 text-gray-400">No votes have been cast yet.</td></tr>`;

      const bannedVotersHtml =
        bannedVoters.length > 0
          ? bannedVoters
              .map(
                (voter) => `
                <tr class="border-b border-gray-700 hover:bg-gray-800/50 opacity-60">
                    <td class="p-3 font-semibold">${escapeHtml(voter.name)}</td>
                    <td class="p-3">${escapeHtml(voter.email)}</td>
                    <td class="p-3 text-center">
                        <button class="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700 unban-voter-btn" data-user-id="${
                          voter.userId
                        }">Unban</button>
                    </td>
                </tr>`
              )
              .join("")
          : `<tr><td colspan="3" class="text-center p-4 text-gray-400">No voters are currently banned.</td></tr>`;

      contentDiv.innerHTML = `
        <div class="space-y-8">
            <div class="bg-gray-800/50 rounded-2xl p-8">
                <h3 class="text-2xl font-bold text-white mb-4">Project Rankings</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full text-left text-white">
                        <thead class="border-b border-gray-600">
                            <tr>
                                <th class="p-3 text-center">Rank</th>
                                <th class="p-3">Project Name</th>
                                <th class="p-3 text-center">Elo Score</th>
                                <th class="p-3 text-center"># Times Voted</th>
                                <th class="p-3 text-center">Avg. Win Margin</th>
                                <th class="p-3 text-center">Confidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rankingsHtml}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="bg-gray-800/50 rounded-2xl p-8">
                    <h3 class="text-2xl font-bold text-white mb-4">Ranking Confidence</h3>
                    <div class="space-y-2">
                        <p><strong>Top 3:</strong> ${
                          confidence.top3 !== null
                            ? `${confidence.top3}%`
                            : "N/A"
                        }</p>
                        <p><strong>Top 5:</strong> ${
                          confidence.top5 !== null
                            ? `${confidence.top5}%`
                            : "N/A"
                        }</p>
                        <p><strong>Top 10:</strong> ${
                          confidence.top10 !== null
                            ? `${confidence.top10}%`
                            : "N/A"
                        }</p>
                    </div>
                </div>
                <div class="bg-gray-800/50 rounded-2xl p-8">
                    <h3 class="text-2xl font-bold text-white mb-4">Voting Stats</h3>
                    <p class="text-4xl font-bold text-indigo-400">${totalVotes}</p>
                    <p class="text-gray-400">Total Votes Cast</p>
                </div>
            </div>

            <div class="bg-gray-800/50 rounded-2xl p-8">
                <h3 class="text-2xl font-bold text-white mb-4">Voter Leaderboard</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full text-left text-white">
                        <thead class="border-b border-gray-600">
                            <tr>
                                <th class="p-3 text-center">Rank</th>
                                <th class="p-3">Name</th>
                                <th class="p-3">Email</th>
                                <th class="p-3 text-center">Votes Cast</th>
                                <th class="p-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${voterLeaderboardHtml}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="bg-gray-800/50 rounded-2xl p-8">
                <h3 class="text-2xl font-bold text-red-400 mb-4">Banned Voters</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full text-left text-white">
                        <thead class="border-b border-gray-600">
                            <tr>
                                <th class="p-3">Name</th>
                                <th class="p-3">Email</th>
                                <th class="p-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bannedVotersHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      `;
      setupVotingEventListeners();
    } catch (error) {
      contentDiv.innerHTML = `<div class="text-center p-8"><p class="text-red-400">Error loading results: ${escapeHtml(
        error.message
      )}</p></div>`;
    }
  };

  const renderAwardsPage = () => {
    const contentDiv = document.getElementById("event-content");
    if (!contentDiv) return;

    const settings = currentEventDetails.awardsSettings || {
      topN: 10,
      customMessage: "Thanks for coming!",
    };
    const approvedProjects = (currentEventDetails.projects || []).filter(
      (p) => p.status === 3
    );
    const approvedCount = approvedProjects.length;

    const topOptions = [
      { value: 10, label: "Top 10", min: 10 },
      { value: 5, label: "Top 5", min: 5 },
      { value: 3, label: "Top 3", min: 3 },
    ];

    const topOptionsHtml = topOptions
      .map((opt) => {
        const disabled = approvedCount < opt.min;
        return `
            <label class="flex items-center space-x-2 ${
              disabled ? "text-gray-500 cursor-not-allowed" : "text-white"
            }">
                <input type="radio" name="topN" value="${
                  opt.value
                }" class="form-radio h-5 w-5 text-indigo-600" 
                    ${settings.topN == opt.value ? "checked" : ""} 
                    ${disabled ? "disabled" : ""}>
                <span>${opt.label}</span>
            </label>
        `;
      })
      .join("");

    contentDiv.innerHTML = `
        <div class="bg-gray-800/50 rounded-2xl p-8 space-y-8">
            <div>
                <h3 class="text-2xl font-bold text-white mb-4">Awards Slideshow Settings</h3>
                <form id="awards-settings-form" class="space-y-6">
                    <div>
                        <label class="block text-m font-medium text-gray-400 mb-2">Slideshow Type</label>
                        <div class="flex space-x-6">
                            ${topOptionsHtml}
                        </div>
                        ${
                          approvedCount < 3
                            ? `<p class="text-yellow-400 text-sm mt-2">You need at least 3 approved projects to run a slideshow.</p>`
                            : ""
                        }
                    </div>
                    <div>
                        <label for="custom-message" class="block text-m font-medium text-gray-400">Custom "Thank You" Message</label>
                        <textarea id="custom-message" rows="3" class="dark-input mt-1 block w-full rounded-md shadow-sm text-lg p-2">${escapeHtml(
                          settings.customMessage
                        )}</textarea>
                    </div>
                    <div class="flex justify-end items-center gap-4">
                        <p id="save-awards-message" class="text-sm text-green-500"></p>
                        <button type="submit" id="save-awards-settings-button" class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition">Save Settings</button>
                    </div>
                </form>
            </div>
            <div class="border-t border-gray-700 pt-8">
                <h3 class="text-2xl font-bold text-white mb-4">Launch Slideshow</h3>
                <p class="text-gray-400 mb-4">This will open a new, fullscreen window to present the awards. Use arrow keys or click to navigate the slides.</p>
                <button id="launch-slideshow-button" class="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition text-xl" ${
                  approvedCount < 3 ? "disabled" : ""
                }>
                    Launch Awards!
                </button>
            </div>
        </div>
    `;
    setupAwardsEventListeners();
  };

  const renderAttendeesPage = () => {
    const contentDiv = document.getElementById("event-content");
    if (!contentDiv) return;

    const event = currentEventDetails;
    const projects = event.projects || [];
    const allAttendees = event.attendees || [];

    const attendeesOnProjects = new Set();
    projects.forEach((project) => {
      attendeesOnProjects.add(project.submittedBy);
      (project.otherTeamMembers || []).forEach((member) => {
        const memberAttendee = allAttendees.find(
          (a) => a.email === member.email
        );
        if (memberAttendee) {
          attendeesOnProjects.add(memberAttendee.userId);
        }
      });
    });

    const nonProjectAttendees = allAttendees.filter(
      (attendee) => !attendeesOnProjects.has(attendee.userId)
    );

    const projectsHtml =
      projects.length > 0
        ? projects
            .map((project) => {
              const projectManager = allAttendees.find(
                (a) => a.userId === project.submittedBy
              );
              const projectManagerName = projectManager?.name || "Unknown";
              const projectManagerEmail = projectManager?.email || "Unknown";
              const projectManagerId = projectManager?.userId;

              const otherMembers = (project.otherTeamMembers || []).map(
                (member) => {
                  const memberAttendee = allAttendees.find(
                    (a) => a.email === member.email
                  );
                  return {
                    ...member,
                    userId: memberAttendee ? memberAttendee.userId : null,
                  };
                }
              );

              const teamName =
                projectManager?.teamName ||
                project.projectName ||
                "Unknown Team";

              const membersHtml = `
            <ul class="mt-2 space-y-1">
              <li>
                <div class="flex justify-between items-center">
                  <div>
                    <span class="text-white font-bold text-lg">${escapeHtml(
                      projectManagerName
                    )}</span> (<span class="text-base">${escapeHtml(
                projectManagerEmail
              )}</span>) - Project Manager
                  </div>
                  <div class="remove-attendee-prompt-container">
                    <button type="button" class="bg-red-600/50 text-red-300 hover:bg-red-500/50 px-3 py-1 text-sm rounded-md transition remove-attendee-btn" data-user-id="${escapeHtml(
                      projectManagerId
                    )}" data-user-email="${escapeHtml(
                projectManagerEmail
              )}">Remove</button>
                  </div>
                </div>
              </li>
              ${otherMembers
                .map(
                  (member) => `
                <li>
                  <div class="flex justify-between items-center">
                    <div>
                      <span class="text-white font-semibold text-lg">${escapeHtml(
                        member.name || "Unknown"
                      )}</span> (<span class="text-base">${escapeHtml(
                    member.email || "Unknown"
                  )}</span>)
                    </div>
                    <div class="remove-attendee-prompt-container">
                      <button type="button" class="bg-red-600/50 text-red-300 hover:bg-red-500/50 px-3 py-1 text-sm rounded-md transition remove-attendee-btn" data-user-id="${escapeHtml(
                        member.userId
                      )}" data-user-email="${escapeHtml(
                    member.email
                  )}">Remove</button>
                    </div>
                  </div>
                </li>
              `
                )
                .join("")}
            </ul>
          `;

              return `
            <div class="bg-gray-900 p-4 rounded-lg">
              <div class="flex justify-between items-center">
                <p class="font-semibold text-xl text-white">${escapeHtml(
                  teamName
                )}</p>
                <button data-project-id="${escapeHtml(
                  project.submittedBy
                )}" class="text-indigo-400 hover:underline text-sm">View Project</button>
              </div>
              <p class="text-gray-400 text-sm mt-1">Project Code: ${escapeHtml(
                project.projectCode
              )}</p>
              ${membersHtml}
            </div>
          `;
            })
            .join("")
        : '<p class="text-gray-400 text-center">No projects have been created yet.</p>';

    const nonProjectAttendeesHtml =
      nonProjectAttendees.length > 0
        ? nonProjectAttendees
            .map(
              (attendee) => `
          <div class="bg-gray-900/50 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p class="font-bold text-xl text-white">${escapeHtml(
                attendee.name
              )}</p>
              <p class="text-gray-400 text-lg">${escapeHtml(attendee.email)}</p>
            </div>
            <div class="remove-attendee-prompt-container">
              <button type="button" class="bg-red-600/50 text-red-300 hover:bg-red-500/50 px-3 py-1 text-sm rounded-md transition remove-attendee-btn" data-user-id="${escapeHtml(
                attendee.userId
              )}" data-user-email="${escapeHtml(
                attendee.email
              )}">Remove</button>
            </div>
          </div>
        `
            )
            .join("")
        : '<p class="text-gray-400 text-center">All attendees are part of a project.</p>';

    contentDiv.innerHTML = `
        <div id="attendees-list-section" class="bg-gray-800/50 rounded-2xl p-8">
                    <h3 class="text-2xl font-bold text-white mb-4">Attendees</h3>

            <input type="text" id="attendee-search-input" placeholder="Search attendees..." class="dark-input w-full rounded-md shadow-sm text-lg p-2 mb-4">
            <div>
                <h3 class="text-2xl font-bold text-white mb-2">Project Teams</h3>
                <div id="project-teams-list" class="space-y-4 mb-8">
                    ${projectsHtml}
                </div>
            </div>
            <div class="border-t border-gray-700 pt-6 space-y-4">
                <h3 class="text-2xl font-bold text-white mb-2">Attendees Not on a Project</h3>
                <div id="non-project-attendees-list" class="space-y-4">
                    ${nonProjectAttendeesHtml}
                </div>
            </div>
        </div>
    `;

    document.querySelectorAll("[data-project-id]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const projectId = e.target.dataset.projectId;
        document.getElementById("tab-projects").click();
        setTimeout(() => {
          const projectDetails = document.querySelector(
            `.project-card[data-user-id="${projectId}"]`
          );
          if (projectDetails) {
            projectDetails.querySelector("details").open = true;
            projectDetails.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }, 100);
      });
    });

    setupAttendeesEventListeners();
  };

  const renderBansPage = () => {
    const contentDiv = document.getElementById("event-content");
    if (!contentDiv) return;

    const event = currentEventDetails;
    const canManageBans =
      currentEventDetails.organizers.find(
        (org) => org.userId === currentOrganizerData.userId
      )?.permissionLevel >= 2;

    const banlistHtml = (event.bannedEmails || [])
      .map(
        (email) => `
            <div class="flex items-center justify-between p-2 rounded-md bg-gray-900/50">
                <p class="text-white">${escapeHtml(email)}</p>
                ${
                  canManageBans
                    ? `
                <div class="unban-prompt-container">
                    <button type="button" class="bg-gray-600/50 text-gray-300 hover:bg-gray-500/50 px-3 py-1 text-sm rounded-md transition unban-btn" data-email="${escapeHtml(
                      email
                    )}">Unban</button>
                </div>
                `
                    : ""
                }
            </div>
        `
      )
      .join("");

    contentDiv.innerHTML = `
        <div id="ban-list-section" class="bg-gray-800/50 rounded-2xl p-8 space-y-6">
            <h3 class="text-2xl font-bold text-red-400 mb-4">Banned Attendees</h3>
            ${
              canManageBans
                ? `
            <form id="add-ban-form" class="space-y-4">
                <div>
                    <label for="ban-email-input" class="block text-m font-medium text-gray-400">Ban an Email Address</label>
                    <div class="flex items-center gap-2 mt-1">
                        <input type="email" id="ban-email-input" placeholder="e.g., hacker@example.com" class="dark-input flex-grow rounded-md shadow-sm text-lg p-2">
                        <button type="submit" id="add-ban-button" class="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition">Ban</button>
                    </div>
                    <p id="add-ban-error" class="text-red-400 text-xs mt-1 h-4"></p>
                </div>
            </form>
            `
                : ""
            }
            <div id="banned-emails-list" class="space-y-2">
                ${
                  banlistHtml.length > 0
                    ? banlistHtml
                    : '<p class="text-gray-400 text-center">No emails are currently banned.</p>'
                }
            </div>
        </div>
    `;

    setupBansEventListeners();
  };

  const renderDangerZonePage = () => {
    const contentDiv = document.getElementById("event-content");
    if (!contentDiv) return;

    const isCreator =
      currentEventDetails.organizers.length > 0 &&
      currentEventDetails.organizers[0].userId === currentOrganizerData.userId;
    const eventName = currentEventDetails.eventName;

    let deleteSection = "";
    if (isCreator) {
      deleteSection = `
            <form id="delete-event-form" class="space-y-4">
                <div class="mt-4 p-4 bg-red-950 rounded-lg border border-red-700">
                    <label for="event-name-confirm" class="block text-sm font-medium text-red-300 mb-2">
                        To confirm deletion, type the event name below:
                    </label>
                    <input type="text" id="event-name-confirm" class="w-full bg-red-800 text-red-100 p-2 rounded-md border-red-700 placeholder-red-400 focus:ring-red-500 focus:border-red-500">
                    <p id="event-name-prompt" class="mt-1 text-sm text-red-400">
                        Type "<b>${escapeHtml(eventName)}</b>" to confirm.
                    </p>
                    <p id="event-name-error" class="text-red-400 text-xs mt-1 h-4"></p>
                </div>
                <div class="flex items-center">
                    <input id="confirm-checkbox" type="checkbox" class="h-4 w-4 text-red-600 bg-red-800 border-red-700 rounded focus:ring-red-500">
                    <label for="confirm-checkbox" class="ml-2 block text-sm text-red-300">
                        I understand what I am about to do.
                    </label>
                </div>
                <button type="submit" id="delete-event-button" class="w-full bg-red-900 text-red-400 px-6 py-2 rounded-lg font-semibold cursor-not-allowed" disabled>
                    Delete Event
                </button>
                <p id="delete-event-message" class="text-sm text-red-300 mt-2 text-center"></p>
            </form>
        `;
    } else {
      deleteSection = `
            <div class="p-4 bg-red-800 rounded-md text-center text-red-300">
                Only the event creator can delete this event.
            </div>
        `;
    }

    contentDiv.innerHTML = `
        <div class="bg-gray-800/50 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 class="text-2xl font-bold text-red-400 mb-4">Danger Zone</h3>
            <p class="text-gray-400 mb-6">Irreversible actions are performed here.</p>
            <div class="space-y-6">
                ${deleteSection}
            </div>
        </div>
    `;

    setupDangerZoneEventListeners(isCreator);
  };

  const loadEventDetails = async (eventCode, token) => {
    try {
      const response = await fetch(
        "https://podium-d74a4f5f498c.herokuapp.com/api/get-event-details",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, eventCode }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch event details.");
      }
      return data.eventDetails;
    } catch (error) {
      console.error("Error loading event details:", error);
      alert(`Error: ${error.message}`);
      return null;
    }
  };

  const loadAndRenderManageEvent = async (eventCode, token) => {
    const eventDetails = await loadEventDetails(eventCode, token);
    if (eventDetails) {
      currentEventDetails = eventDetails;
      renderManageEventState(eventDetails);
    } else {
      organizerMainContent.innerHTML = `<div class="max-w-lg mx-auto text-center"><p class="text-red-400 text-center">Error fetching event details. Redirecting...</p></div>`;
      setTimeout(() => renderDashboardState(), 3000);
    }
  };

  const refreshCurrentPage = async () => {
    const token = localStorage.getItem("podium-pro-organizer-token");
    if (token && currentEventDetails) {
      const eventDetails = await loadEventDetails(
        currentEventDetails.eventCode,
        token
      );
      if (eventDetails) {
        currentEventDetails = eventDetails;
        const activeTab = document.querySelector(
          ".border-b-2.border-indigo-500, .border-b-2.border-red-500"
        );
        if (activeTab) {
          switch (activeTab.id) {
            case "tab-details":
              renderDetailsPage();
              break;
            case "tab-organizers":
              renderOrganizersPage();
              break;
            case "tab-projects":
              renderProjectsPage();
              break;
            case "tab-voting":
              renderVotingResultsPage();
              break;
            case "tab-awards":
              renderAwardsPage();
              break;
            case "tab-attendees":
              renderAttendeesPage();
              break;
            case "tab-bans":
              renderBansPage();
              break;
            case "tab-danger-zone":
              renderDangerZonePage();
              break;
            default:
              renderDetailsPage();
          }
        }
      } else {
        checkLoginStatus();
      }
    }
  };

  const checkLoginStatus = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    const eventCodeFromUrl = urlParams.get("eventCode");
    let token = localStorage.getItem("podium-pro-organizer-token");

    if (tokenFromUrl || eventCodeFromUrl) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (tokenFromUrl) {
      try {
        const response = await fetch(
          "https://podium-d74a4f5f498c.herokuapp.com/api/verify-organizer-magic-token",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: tokenFromUrl }),
          }
        );
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message);

        localStorage.setItem("podium-pro-organizer-token", data.sessionToken);
        token = data.sessionToken;
      } catch (error) {
        organizerMainContent.innerHTML = `<div class="max-w-lg mx-auto text-center"><p class="text-red-400 text-center">${escapeHtml(
          error.message
        )}. Please try logging in again.</p></div>`;
        setTimeout(() => renderLoginState(), 3000);
        return;
      }
    }

    if (!token) {
      lastKnownToken = null;
      renderLoginState();
      return;
    }

    try {
      const response = await fetch(
        "https://podium-d74a4f5f498c.herokuapp.com/api/verify-organizer-magic-token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message);

      currentOrganizerData = data.organizerData;
      localStorage.setItem("podium-pro-organizer-token", data.sessionToken);
      lastKnownToken = data.sessionToken;

      if (eventCodeFromUrl) {
        await loadAndRenderManageEvent(eventCodeFromUrl, token);
      } else {
        renderDashboardState();
      }
    } catch (error) {
      console.error("Session verification failed:", error);
      localStorage.removeItem("podium-pro-organizer-token");
      lastKnownToken = null;
      renderLoginState();
    }
  };

  // --- Event Listener Setup ---
  function setupLoginListeners() {
    const fullNameInput = document.getElementById("full-name-input");
    const emailInput = document.getElementById("email-input");
    const getMagicLinkButton = document.getElementById("get-magic-link-button");
    const errorMessage = document.getElementById("error-message");

    const validateForm = () => {
      const email = emailInput.value.trim();
      const fullName = fullNameInput.value.trim();
      const emailRegex =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      if (fullName && emailRegex.test(email)) {
        getMagicLinkButton.disabled = false;
        getMagicLinkButton.classList.remove("opacity-50", "cursor-not-allowed");
      } else {
        getMagicLinkButton.disabled = true;
        getMagicLinkButton.classList.add("opacity-50", "cursor-not-allowed");
      }
    };

    if (fullNameInput) {
      fullNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (emailInput) emailInput.focus();
        }
      });
    }

    if (emailInput) {
      emailInput.addEventListener("keydown", (e) => {
        if (
          e.key === "Enter" &&
          getMagicLinkButton &&
          !getMagicLinkButton.disabled
        ) {
          e.preventDefault();
          getMagicLinkButton.click();
        }
      });
    }

    if (fullNameInput) fullNameInput.addEventListener("input", validateForm);
    if (emailInput) emailInput.addEventListener("input", validateForm);

    if (getMagicLinkButton) {
      getMagicLinkButton.addEventListener("click", async () => {
        const fullName = fullNameInput?.value.trim();
        const email = emailInput?.value.trim();

        if (errorMessage) errorMessage.textContent = "";

        if (!fullName) {
          if (errorMessage)
            errorMessage.textContent = "Please enter your full name.";
          return;
        }
        if (
          !email ||
          !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
            email
          )
        ) {
          if (errorMessage)
            errorMessage.textContent = "Please enter a valid email address.";
          return;
        }

        getMagicLinkButton.textContent = "Sending...";
        getMagicLinkButton.disabled = true;
        getMagicLinkButton.classList.add("opacity-50", "cursor-not-allowed");

        try {
          const response = await fetch(
            "https://podium-d74a4f5f498c.herokuapp.com/api/send-organizer-magic-link",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fullName, email }),
            }
          );

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Failed to send magic link.");
          }
          renderSentState(email);
        } catch (error) {
          if (errorMessage) errorMessage.textContent = error.message;
          getMagicLinkButton.textContent = "Get Magic Link";
          getMagicLinkButton.disabled = false;
          getMagicLinkButton.classList.remove(
            "opacity-50",
            "cursor-not-allowed"
          );
        }
      });
    }
  }

  function setupDashboardListeners() {
    const createEventButton = document.getElementById("create-event-button");
    const createEventForm = document.getElementById("create-event-form");
    const newEventForm = document.getElementById("new-event-form");
    const cancelCreateEventButton = document.getElementById(
      "cancel-create-event"
    );
    const organizersList = document.getElementById("organizers-list");
    const addOrganizerButton = document.getElementById("add-organizer-button");
    const organizerEmailInput = document.getElementById(
      "organizer-email-input"
    );
    const organizerEmailError = document.getElementById(
      "organizer-email-error"
    );
    const manageEventButtons = document.querySelectorAll(
      ".manage-event-button"
    );
    const logoutButton = document.getElementById("logout-button");

    let otherOrganizers = [];

    const renderOrganizerList = () => {
      if (organizersList) {
        organizersList.innerHTML = otherOrganizers
          .map(
            (email) => `
          <div class="flex items-center justify-between p-2 rounded-md bg-gray-900/50">
            <p>${escapeHtml(email)}</p>
            <button type="button" class="bg-red-600/50 text-red-300 hover:bg-red-500/50 px-3 py-1 text-sm rounded-md transition remove-organizer-btn" data-email="${escapeHtml(
              email
            )}">Remove</button>
          </div>
        `
          )
          .join("");
      }
    };

    const emailRegex =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (createEventButton) {
      createEventButton.addEventListener("click", () => {
        createEventButton.classList.add("hidden");
        if (createEventForm) createEventForm.classList.remove("hidden");
        const eventNameInput = document.getElementById("event-name-input");
        const eventDescInput = document.getElementById("event-desc-input");
        if (eventNameInput) eventNameInput.value = "";
        if (eventDescInput) eventDescInput.value = "";
        if (organizerEmailInput) organizerEmailInput.value = "";
        otherOrganizers = [];
        renderOrganizerList();
      });
    }

    if (cancelCreateEventButton) {
      cancelCreateEventButton.addEventListener("click", () => {
        if (createEventButton) createEventButton.classList.remove("hidden");
        if (createEventForm) createEventForm.classList.add("hidden");
      });
    }

    if (addOrganizerButton) {
      addOrganizerButton.addEventListener("click", () => {
        const email = organizerEmailInput?.value.trim();
        if (emailRegex.test(email)) {
          if (!otherOrganizers.includes(email)) {
            otherOrganizers.push(email);
            renderOrganizerList();
            if (organizerEmailInput) organizerEmailInput.value = "";
            if (organizerEmailError) organizerEmailError.textContent = "";
          } else {
            if (organizerEmailError)
              organizerEmailError.textContent =
                "This organizer email has already been added.";
          }
        } else {
          if (organizerEmailError)
            organizerEmailError.textContent =
              "Please enter a valid email address.";
        }
      });
    }

    if (organizersList) {
      organizersList.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-organizer-btn")) {
          const emailToRemove = e.target.dataset.email;
          otherOrganizers = otherOrganizers.filter(
            (email) => email !== emailToRemove
          );
          renderOrganizerList();
        }
      });
    }

    if (newEventForm) {
      newEventForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const eventNameInput = document.getElementById("event-name-input");
        const descriptionInput = document.getElementById("event-desc-input");
        const eventName = eventNameInput?.value.trim();
        const description = descriptionInput?.value.trim();

        const eventNameError = document.getElementById("event-name-error");
        const eventDescError = document.getElementById("event-desc-error");

        if (eventNameError) eventNameError.textContent = "";
        if (eventDescError) eventDescError.textContent = "";

        let isValid = true;
        if (!eventName || eventName.length > 100) {
          if (eventNameError)
            eventNameError.textContent =
              "Event name is required and must be 100 characters or less.";
          isValid = false;
        }
        if (!description || description.length > 1000) {
          if (eventDescError)
            eventDescError.textContent =
              "Description is required and must be 1000 characters or less.";
          isValid = false;
        }

        if (!isValid) return;

        const token = localStorage.getItem("podium-pro-organizer-token");
        const saveButton = document.getElementById("save-event-button");

        if (saveButton) {
          saveButton.textContent = "Creating...";
          saveButton.disabled = true;
        }

        try {
          const response = await fetch(
            "https://podium-d74a4f5f498c.herokuapp.com/api/create-event",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                eventName,
                description,
                organizerEmails: otherOrganizers,
              }),
            }
          );
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Failed to create event.");
          }

          if (saveButton) {
            saveButton.textContent = "Created!";
            setTimeout(() => {
              saveButton.textContent = "Create Event";
              saveButton.disabled = false;
            }, 2000);
          }

          checkLoginStatus();
        } catch (error) {
          alert("Error creating event: " + error.message);
          if (saveButton) {
            saveButton.textContent = "Create Event";
            saveButton.disabled = false;
          }
        }
      });
    }

    if (manageEventButtons) {
      manageEventButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const eventCode = button.dataset.eventCode;
          if (eventCode) {
            window.location.href = `./index.html?eventCode=${eventCode}`;
          }
        });
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        localStorage.removeItem("podium-pro-organizer-token");
        window.location.replace("./");
      });
    }
  }

  function setupManageEventListeners() {
    const backButton = document.getElementById("back-to-dashboard-button");
    const logoutButton = document.getElementById("logout-button-manage");
    const refreshButton = document.getElementById("refresh-button");
    const tabDetails = document.getElementById("tab-details");
    const tabOrganizers = document.getElementById("tab-organizers");
    const tabProjects = document.getElementById("tab-projects");
    const tabVoting = document.getElementById("tab-voting");
    const tabAwards = document.getElementById("tab-awards");
    const tabAttendees = document.getElementById("tab-attendees");
    const tabBans = document.getElementById("tab-bans");
    const tabDangerZone = document.getElementById("tab-danger-zone");

    const handleTabClick = (tabElement, pageRenderer) => {
      document.querySelectorAll(".border-b-2").forEach((tab) => {
        tab.classList.remove(
          "border-indigo-500",
          "text-white",
          "border-red-500",
          "text-red-500"
        );
        tab.classList.add("border-transparent", "text-gray-400");
      });
      tabElement.classList.remove("border-transparent", "text-gray-400");

      if (tabElement.id === "tab-danger-zone" || tabElement.id === "tab-bans") {
        tabElement.classList.add("border-red-500", "text-red-500");
      } else {
        tabElement.classList.add("border-indigo-500", "text-white");
      }
      pageRenderer();
    };

    if (tabDetails)
      tabDetails.addEventListener("click", () =>
        handleTabClick(tabDetails, renderDetailsPage)
      );
    if (tabOrganizers)
      tabOrganizers.addEventListener("click", () =>
        handleTabClick(tabOrganizers, renderOrganizersPage)
      );
    if (tabProjects)
      tabProjects.addEventListener("click", () =>
        handleTabClick(tabProjects, renderProjectsPage)
      );
    if (tabVoting)
      tabVoting.addEventListener("click", () =>
        handleTabClick(tabVoting, renderVotingResultsPage)
      );
    if (tabAwards)
      tabAwards.addEventListener("click", () =>
        handleTabClick(tabAwards, renderAwardsPage)
      );
    if (tabAttendees)
      tabAttendees.addEventListener("click", () =>
        handleTabClick(tabAttendees, renderAttendeesPage)
      );
    if (tabBans)
      tabBans.addEventListener("click", () =>
        handleTabClick(tabBans, renderBansPage)
      );
    if (tabDangerZone)
      tabDangerZone.addEventListener("click", () =>
        handleTabClick(tabDangerZone, renderDangerZonePage)
      );

    if (backButton) {
      backButton.addEventListener("click", () => {
        window.location.href = "./";
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        localStorage.removeItem("podium-pro-organizer-token");
        window.location.replace("./");
      });
    }

    if (refreshButton) {
      refreshButton.addEventListener("click", () => {
        refreshCurrentPage();
      });
    }
  }

  function setupDetailsEventListeners() {
    const eventDetailsForm = document.getElementById("event-details-form");
    const eventNameEditInput = document.getElementById("event-name-edit");
    const eventDescEditTextarea = document.getElementById("event-desc-edit");
    const votingStatusToggle = document.getElementById("voting-status-toggle");
    const shippingStatusToggle = document.getElementById(
      "shipping-status-toggle"
    );
    const votingStatusText = document.getElementById("voting-status-text");
    const shippingStatusText = document.getElementById("shipping-status-text");
    const saveEventDetailsButton = document.getElementById(
      "save-event-details-button"
    );
    const saveDetailsMessage = document.getElementById("save-details-message");
    const demoUrlToggle = document.getElementById("demo-url-required-toggle");
    const repoUrlToggle = document.getElementById("repo-url-required-toggle");
    const imageUrlToggle = document.getElementById("image-url-required-toggle");

    if (
      !eventNameEditInput ||
      !eventDescEditTextarea ||
      !votingStatusToggle ||
      !shippingStatusToggle ||
      !eventDetailsForm ||
      !saveEventDetailsButton ||
      !demoUrlToggle ||
      !repoUrlToggle ||
      !imageUrlToggle
    ) {
      return;
    }

    let originalEventDetails = {
      eventName: eventNameEditInput.value,
      description: eventDescEditTextarea.value,
      votingOpen: votingStatusToggle.checked,
      shippingOpen: shippingStatusToggle.checked,
      demoUrlRequired: demoUrlToggle.checked,
      repoUrlRequired: repoUrlToggle.checked,
      imageUrlRequired: imageUrlToggle.checked,
    };

    const checkForUnsavedChanges = () => {
      const nameChanged =
        eventNameEditInput.value.trim() !== originalEventDetails.eventName;
      const descChanged =
        eventDescEditTextarea.value.trim() !== originalEventDetails.description;
      const votingChanged =
        votingStatusToggle.checked !== originalEventDetails.votingOpen;
      const shippingChanged =
        shippingStatusToggle.checked !== originalEventDetails.shippingOpen;
      const demoChanged =
        demoUrlToggle.checked !== originalEventDetails.demoUrlRequired;
      const repoChanged =
        repoUrlToggle.checked !== originalEventDetails.repoUrlRequired;
      const imageChanged =
        imageUrlToggle.checked !== originalEventDetails.imageUrlRequired;

      if (
        nameChanged ||
        descChanged ||
        votingChanged ||
        shippingChanged ||
        demoChanged ||
        repoChanged ||
        imageChanged
      ) {
        if (saveDetailsMessage) {
          saveDetailsMessage.textContent = "Unsaved changes";
          saveDetailsMessage.className = "text-sm text-yellow-500";
        }
      } else {
        if (saveDetailsMessage) saveDetailsMessage.textContent = "";
      }
    };

    eventNameEditInput.addEventListener("input", checkForUnsavedChanges);
    eventDescEditTextarea.addEventListener("input", checkForUnsavedChanges);
    votingStatusToggle.addEventListener("change", () => {
      if (votingStatusText)
        votingStatusText.textContent = `${
          votingStatusToggle.checked ? "Open" : "Closed"
        }`;
      checkForUnsavedChanges();
    });
    shippingStatusToggle.addEventListener("change", () => {
      if (shippingStatusText)
        shippingStatusText.textContent = `${
          shippingStatusToggle.checked ? "Open" : "Closed"
        }`;
      checkForUnsavedChanges();
    });
    demoUrlToggle.addEventListener("change", checkForUnsavedChanges);
    repoUrlToggle.addEventListener("change", checkForUnsavedChanges);
    imageUrlToggle.addEventListener("change", checkForUnsavedChanges);

    eventDetailsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const eventName = eventNameEditInput.value.trim();
      const description = eventDescEditTextarea.value.trim();
      const votingOpen = votingStatusToggle.checked;
      const shippingOpen = shippingStatusToggle.checked;
      const demoUrlRequired = demoUrlToggle.checked;
      const repoUrlRequired = repoUrlToggle.checked;
      const imageUrlRequired = imageUrlToggle.checked;

      const eventNameError = document.getElementById("event-name-edit-error");
      const eventDescError = document.getElementById("event-desc-edit-error");
      if (eventNameError) eventNameError.textContent = "";
      if (eventDescError) eventDescError.textContent = "";

      let isValid = true;
      if (!eventName || eventName.length > 100) {
        if (eventNameError)
          eventNameError.textContent =
            "Event name is required and must be 100 characters or less.";
        isValid = false;
      }
      if (!description || description.length > 1000) {
        if (eventDescError)
          eventDescError.textContent =
            "Description is required and must be 1000 characters or less.";
        isValid = false;
      }

      if (!isValid) return;

      saveEventDetailsButton.textContent = "Saving...";
      saveEventDetailsButton.disabled = true;
      if (saveDetailsMessage) saveDetailsMessage.textContent = "";

      const token = localStorage.getItem("podium-pro-organizer-token");
      try {
        const response = await fetch(
          "https://podium-d74a4f5f498c.herokuapp.com/api/update-event-details",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              eventCode: currentEventDetails.eventCode,
              eventName,
              description,
              organizers: currentEventDetails.organizers,
              votingOpen,
              shippingOpen,
              demoUrlRequired,
              repoUrlRequired,
              imageUrlRequired,
            }),
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        currentEventDetails.eventName = eventName;
        currentEventDetails.description = description;
        currentEventDetails.votingOpen = votingOpen;
        currentEventDetails.shippingOpen = shippingOpen;
        currentEventDetails.demoUrlRequired = demoUrlRequired;
        currentEventDetails.repoUrlRequired = repoUrlRequired;
        currentEventDetails.imageUrlRequired = imageUrlRequired;

        originalEventDetails = {
          eventName,
          description,
          votingOpen,
          shippingOpen,
          demoUrlRequired,
          repoUrlRequired,
          imageUrlRequired,
        };

        if (saveDetailsMessage) {
          saveDetailsMessage.textContent = "Saved!";
          saveDetailsMessage.className = "text-sm text-green-500";
        }

        setTimeout(() => {
          if (saveDetailsMessage) saveDetailsMessage.textContent = "";
          checkForUnsavedChanges();
        }, 2000);
      } catch (error) {
        if (saveDetailsMessage) {
          saveDetailsMessage.textContent = `Error: ${error.message}`;
          saveDetailsMessage.className = "text-sm text-red-500";
        }
        setTimeout(() => {
          if (saveDetailsMessage) saveDetailsMessage.textContent = "";
          checkForUnsavedChanges();
        }, 3000);
      } finally {
        if (saveEventDetailsButton) {
          saveEventDetailsButton.textContent = "Save Details";
          saveEventDetailsButton.disabled = false;
        }
      }
    });

    const copyButton = document.getElementById("copy-code-button");
    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(currentEventDetails.eventCode);
          const originalText = copyButton.textContent;
          copyButton.textContent = "Copied!";
          setTimeout(() => {
            copyButton.textContent = originalText;
          }, 2000);
        } catch (err) {
          console.error("Failed to copy text:", err);
          alert("Failed to copy code. Please copy it manually.");
        }
      });
    }
  }

  function setupOrganizersEventListeners() {
    const addOrganizerEmailInput = document.getElementById(
      "add-organizer-email-input"
    );
    const addOrganizerEmailButton = document.getElementById(
      "add-organizer-email-button"
    );
    const addOrganizerError = document.getElementById("add-organizer-error");
    const manageOrganizersList = document.getElementById(
      "manage-organizers-list"
    );

    const emailRegex =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (addOrganizerEmailButton) {
      addOrganizerEmailButton.addEventListener("click", async () => {
        const email = addOrganizerEmailInput?.value.trim();
        if (addOrganizerError) addOrganizerError.textContent = "";

        if (!email || !emailRegex.test(email)) {
          if (addOrganizerError)
            addOrganizerError.textContent =
              "Please enter a valid email address.";
          return;
        }

        if (
          (currentEventDetails.organizers || []).some(
            (org) => org.email === email
          )
        ) {
          if (addOrganizerError)
            addOrganizerError.textContent =
              "This organizer is already on the list.";
          return;
        }

        addOrganizerEmailButton.textContent = "Adding...";
        addOrganizerEmailButton.disabled = true;

        try {
          const token = localStorage.getItem("podium-pro-organizer-token");
          const response = await fetch(
            "https://podium-d74a4f5f498c.herokuapp.com/api/add-organizer-to-event",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                eventCode: currentEventDetails.eventCode,
                email,
              }),
            }
          );
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message);
          }

          refreshCurrentPage();
        } catch (error) {
          if (addOrganizerError)
            addOrganizerError.textContent = `Failed to add organizer: ${escapeHtml(
              error.message
            )}`;
        } finally {
          if (addOrganizerEmailButton) {
            addOrganizerEmailButton.textContent = "Add";
            addOrganizerEmailButton.disabled = false;
          }
          if (addOrganizerEmailInput) addOrganizerEmailInput.value = "";
        }
      });
    }

    if (manageOrganizersList) {
      manageOrganizersList.addEventListener("click", async (e) => {
        if (e.target.classList.contains("remove-organizer-btn")) {
          const targetButton = e.target;
          const emailToRemove = targetButton.dataset.email;
          const promptContainer = targetButton.closest(
            ".remove-organizer-prompt-container"
          );
          if (!promptContainer) return;
          const originalHtml = promptContainer.innerHTML;

          const isRemovingSelf = emailToRemove === currentOrganizerData.email;

          let promptHtml = "";
          if (isRemovingSelf) {
            promptHtml = `
              <div class="mt-2 p-2 bg-red-900 rounded-md">
                <span class="text-red-400 text-sm">If you proceed, you will be removed from the event "${escapeHtml(
                  currentEventDetails.eventName
                )}". You will not be able to rejoin unless invited again by another organizer. Are you sure you wish to proceed?</span>
                <div class="mt-2 flex justify-end space-x-2">
                  <button type="button" class="bg-red-600 px-2 py-1 text-sm text-white rounded-md confirm-remove-organizer-btn">Yes</button>
                  <button type="button" class="bg-gray-600 px-2 py-1 text-sm text-white rounded-md cancel-remove-organizer-btn">No</button>
                </div>
              </div>
            `;
          } else {
            promptHtml = `
              <span class="text-red-400 text-sm">Are you sure?</span>
              <button type="button" class="bg-red-600 px-2 py-1 text-sm text-white rounded-md ml-2 confirm-remove-organizer-btn">Yes</button>
              <button type="button" class="bg-gray-600 px-2 py-1 text-sm text-white rounded-md ml-2 cancel-remove-organizer-btn">No</button>
            `;
          }

          promptContainer.innerHTML = promptHtml;

          promptContainer
            .querySelector(".confirm-remove-organizer-btn")
            ?.addEventListener("click", async () => {
              const token = localStorage.getItem("podium-pro-organizer-token");
              const organizers = (currentEventDetails.organizers || []).filter(
                (org) => org.email !== emailToRemove
              );

              try {
                const response = await fetch(
                  "https://podium-d74a4f5f498c.herokuapp.com/api/update-event-details",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      token,
                      eventCode: currentEventDetails.eventCode,
                      eventName: currentEventDetails.eventName,
                      description: currentEventDetails.description,
                      organizers,
                      votingOpen: currentEventDetails.votingOpen,
                      shippingOpen: currentEventDetails.shippingOpen,
                      demoUrlRequired: currentEventDetails.demoUrlRequired,
                      repoUrlRequired: currentEventDetails.repoUrlRequired,
                      imageUrlRequired: currentEventDetails.imageUrlRequired,
                    }),
                  }
                );
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);

                if (isRemovingSelf) {
                  alert("You have been removed from the event.");
                  window.location.href = "./";
                  return;
                }

                refreshCurrentPage();
              } catch (error) {
                alert(
                  `Failed to remove organizer: ${escapeHtml(error.message)}`
                );
                promptContainer.innerHTML = originalHtml;
              }
            });

          promptContainer
            .querySelector(".cancel-remove-organizer-btn")
            ?.addEventListener("click", () => {
              promptContainer.innerHTML = originalHtml;
            });
        }
      });
    }

    document.querySelectorAll(".permission-selector").forEach((select) => {
      select.addEventListener("change", async (e) => {
        const token = localStorage.getItem("podium-pro-organizer-token");
        const targetEmail = e.target.dataset.email;
        const newPermissionLevel = parseInt(e.target.value, 10);

        try {
          const response = await fetch(
            "https://podium-d74a4f5f498c.herokuapp.com/api/update-organizer-permission",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                eventCode: currentEventDetails.eventCode,
                targetEmail,
                newPermissionLevel,
              }),
            }
          );

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message);
          }

          refreshCurrentPage();
        } catch (error) {
          alert(`Failed to update permission: ${escapeHtml(error.message)}`);
          refreshCurrentPage();
        }
      });
    });
  }

  function setupProjectsEventListeners() {
    const canEditProjects =
      currentEventDetails.organizers.find(
        (org) => org.userId === currentOrganizerData.userId
      )?.permissionLevel >= 1;
    const projectListContainer = document.getElementById(
      "project-list-container"
    );
    const projectSearchInput = document.getElementById("project-search-input");

    const filterProjects = () => {
      if (!projectSearchInput) return;
      const query = projectSearchInput.value.toLowerCase();
      const projectCards = document.querySelectorAll(".project-card");
      projectCards.forEach((card) => {
        const projectName = card
          .querySelector("summary > div:first-child > span:first-child")
          .textContent.toLowerCase();
        const projectManagerName = card
          .querySelector("summary > div:first-child > span:last-child")
          .textContent.toLowerCase();
        let teamMemberNames = "";
        const membersList = card.querySelectorAll(".team-members-list li");
        membersList.forEach((li) => {
          teamMemberNames += li.textContent.toLowerCase() + " ";
        });
        if (
          projectName.includes(query) ||
          projectManagerName.includes(query) ||
          teamMemberNames.includes(query)
        ) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    };

    if (projectSearchInput) {
      projectSearchInput.addEventListener("input", filterProjects);
    }

    if (canEditProjects && projectListContainer) {
      projectListContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("edit-project-button")) {
          const projectCard = e.target.closest(".project-card");
          if (!projectCard) return;
          const viewMode = projectCard.querySelector(".project-view-mode");
          const editMode = projectCard.querySelector(".project-edit-mode");
          if (viewMode && editMode) {
            viewMode.classList.add("hidden");
            editMode.classList.remove("hidden");
          }
        }
        if (e.target.classList.contains("cancel-edit-button")) {
          const projectCard = e.target.closest(".project-card");
          if (!projectCard) return;
          const viewMode = projectCard.querySelector(".project-view-mode");
          const editMode = projectCard.querySelector(".project-edit-mode");
          if (viewMode && editMode) {
            viewMode.classList.remove("hidden");
            editMode.classList.add("hidden");
          }
        }
        if (e.target.classList.contains("reject-button")) {
          const parentContainer = e.target.closest("details");
          if (!parentContainer) return;
          const rejectNoteContainer = parentContainer.querySelector(
            ".reject-note-container"
          );
          if (rejectNoteContainer) {
            rejectNoteContainer.classList.toggle("hidden");
          }
        }
      });

      projectListContainer.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (e.target.classList.contains("project-edit-form")) {
          const form = e.target;
          const userId = form.dataset.userId;
          if (!userId) return;

          const projectData = {
            projectName: form.querySelector(`#project-name-${userId}`)?.value,
            description: form.querySelector(`#project-desc-${userId}`)?.value,
            demoUrl: form.querySelector(`#demo-url-${userId}`)?.value,
            repoUrl: form.querySelector(`#repo-url-${userId}`)?.value,
            imageUrl: form.querySelector(`#image-url-${userId}`)?.value,
          };
          if (!projectData.projectName || !projectData.description) {
            alert("Project name and description are required.");
            return;
          }

          const saveButton = form.querySelector(".save-project-button");
          if (saveButton) {
            saveButton.textContent = "Saving...";
            saveButton.disabled = true;
          }

          try {
            const token = localStorage.getItem("podium-pro-organizer-token");
            const response = await fetch(
              "https://podium-d74a4f5f498c.herokuapp.com/api/update-project-organizer",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  eventCode: currentEventDetails.eventCode,
                  userId,
                  projectData,
                }),
              }
            );

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            refreshCurrentPage();
          } catch (error) {
            alert("Failed to save project: " + escapeHtml(error.message));
            if (saveButton) {
              saveButton.textContent = "Save";
              saveButton.disabled = false;
            }
          }
        }
      });
    }

    document.querySelectorAll(".save-status-button").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const userId = e.target.dataset.userId;
        const parentDetails = e.target.closest("details");
        if (!parentDetails || !userId) return;

        const statusSelector = parentDetails.querySelector(".status-selector");
        const noteInput = parentDetails.querySelector(".status-note-input");
        if (!statusSelector || !noteInput) return;

        const status = parseInt(statusSelector.value, 10);
        const shipNote = noteInput.value.trim();
        const token = localStorage.getItem("podium-pro-organizer-token");

        e.target.textContent = "Saving...";
        e.target.disabled = true;

        try {
          const response = await fetch(
            "https://podium-d74a4f5f498c.herokuapp.com/api/update-project-status-organizer",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                eventCode: currentEventDetails.eventCode,
                userId,
                status,
                shipNote,
              }),
            }
          );
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);

          refreshCurrentPage();
        } catch (error) {
          alert("Failed to save project status: " + escapeHtml(error.message));
          e.target.textContent = "Save";
          e.target.disabled = false;
        }
      });
    });

    document.querySelectorAll(".approve-button").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const userId = e.target.dataset.userId;
        if (!userId) return;
        const token = localStorage.getItem("podium-pro-organizer-token");
        const originalText = e.target.textContent;

        e.target.textContent = "Approving...";
        e.target.disabled = true;

        try {
          const response = await fetch(
            "https://podium-d74a4f5f498c.herokuapp.com/api/update-project-status-organizer",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                eventCode: currentEventDetails.eventCode,
                userId,
                status: 3, // Approved
                shipNote: "",
              }),
            }
          );
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);

          refreshCurrentPage();
        } catch (error) {
          alert("Failed to approve project: " + escapeHtml(error.message));
          e.target.textContent = originalText;
          e.target.disabled = false;
        }
      });
    });

    document
      .querySelectorAll(".submit-reject-note-button")
      .forEach((button) => {
        button.addEventListener("click", async (e) => {
          const userId = e.target.dataset.userId;
          if (!userId) return;

          const parentDetails = e.target.closest("details");
          if (!parentDetails) return;
          const noteInput = parentDetails.querySelector(".reject-note-input");
          if (!noteInput) return;

          const shipNote = noteInput.value.trim();
          const token = localStorage.getItem("podium-pro-organizer-token");
          const originalText = e.target.textContent;

          if (!shipNote) {
            alert("Please enter a note before rejecting the project.");
            return;
          }

          e.target.textContent = "Submitting...";
          e.target.disabled = true;

          try {
            const response = await fetch(
              "https://podium-d74a4f5f498c.herokuapp.com/api/update-project-status-organizer",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  eventCode: currentEventDetails.eventCode,
                  userId,
                  status: 1, // Needs Attention
                  shipNote,
                }),
              }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            refreshCurrentPage();
          } catch (error) {
            alert("Failed to reject project: " + escapeHtml(error.message));
            e.target.textContent = originalText;
            e.target.disabled = false;
          }
        });
      });
  }

  function setupVotingEventListeners() {
    document.querySelectorAll(".ban-voter-btn").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const voterUserId = e.target.dataset.userId;
        if (
          confirm(
            "Are you sure you want to ban this voter and erase all their votes? This action cannot be undone."
          )
        ) {
          const token = localStorage.getItem("podium-pro-organizer-token");
          try {
            const response = await fetch(
              "https://podium-d74a4f5f498c.herokuapp.com/api/ban-voter",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  eventCode: currentEventDetails.eventCode,
                  voterUserId,
                }),
              }
            );
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            alert("Voter banned successfully.");
            refreshCurrentPage();
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      });
    });

    document.querySelectorAll(".unban-voter-btn").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const voterUserId = e.target.dataset.userId;
        if (confirm("Are you sure you want to unban this voter?")) {
          const token = localStorage.getItem("podium-pro-organizer-token");
          try {
            const response = await fetch(
              "https://podium-d74a4f5f498c.herokuapp.com/api/unban-voter",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  eventCode: currentEventDetails.eventCode,
                  voterUserId,
                }),
              }
            );
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            alert("Voter unbanned successfully.");
            refreshCurrentPage();
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      });
    });

    document.querySelectorAll(".erase-votes-btn").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const voterUserId = e.target.dataset.userId;
        if (
          confirm("Are you sure you want to erase all votes from this voter?")
        ) {
          const token = localStorage.getItem("podium-pro-organizer-token");
          try {
            const response = await fetch(
              "https://podium-d74a4f5f498c.herokuapp.com/api/erase-voter-votes",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  eventCode: currentEventDetails.eventCode,
                  voterUserId,
                }),
              }
            );
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            alert("Votes erased successfully.");
            refreshCurrentPage();
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      });
    });
  }

  function setupAwardsEventListeners() {
    const form = document.getElementById("awards-settings-form");
    const saveButton = document.getElementById("save-awards-settings-button");
    const messageP = document.getElementById("save-awards-message");
    const launchButton = document.getElementById("launch-slideshow-button");

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const topN = parseInt(formData.get("topN"), 10);
        const customMessage = document.getElementById("custom-message").value;

        const settings = { topN, customMessage };

        saveButton.textContent = "Saving...";
        saveButton.disabled = true;
        messageP.textContent = "";

        const token = localStorage.getItem("podium-pro-organizer-token");
        try {
          const response = await fetch(
            "https://podium-d74a4f5f498c.herokuapp.com/api/update-awards-settings",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                eventCode: currentEventDetails.eventCode,
                settings,
              }),
            }
          );
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);

          // Update local state
          currentEventDetails.awardsSettings = settings;

          messageP.textContent = "Settings saved!";
          setTimeout(() => {
            messageP.textContent = "";
          }, 2000);
        } catch (error) {
          messageP.className = "text-sm text-red-500";
          messageP.textContent = `Error: ${error.message}`;
        } finally {
          saveButton.textContent = "Save Settings";
          saveButton.disabled = false;
        }
      });
    }

    if (launchButton) {
      launchButton.addEventListener("click", () => {
        const slideshowHtml = generateSlideshowHTML();
        const newWindow = window.open("", "_blank");
        newWindow.document.write(slideshowHtml);
        newWindow.document.close();
        // Requesting fullscreen must be done in the new window's context
        newWindow.onload = () => {
          newWindow.document.documentElement
            .requestFullscreen()
            .catch((err) => {
              console.error(
                `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
              );
            });
        };
      });
    }
  }

  function generateSlideshowHTML() {
    const settings = currentEventDetails.awardsSettings || {
      topN: 10,
      customMessage: "Thanks for coming!",
    };
    const approvedProjects = (currentEventDetails.projects || [])
      .filter((p) => p.status === 3)
      .sort((a, b) => b.eloScore - a.eloScore);

    const topProjects = approvedProjects.slice(0, settings.topN);

    // Helper to get full project details including team members
    const getProjectDetailsWithTeam = (project) => {
      if (!project) return null;
      const teamMembers = (currentEventDetails.attendees || [])
        .filter((a) => a.projectCode === project.projectCode)
        .map((a) => a.name);
      return { ...project, teamMembers };
    };

    const slides = [];
    const placementSuffix = (n) => {
      if (n > 3 && n < 21) return "th";
      switch (n % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    // Generate slides for each winner, from last to first
    for (let i = topProjects.length - 1; i >= 0; i--) {
      const project = getProjectDetailsWithTeam(topProjects[i]);
      const rank = i + 1;

      // Anticipation Slide
      slides.push(`
            <div class="slide anticipation">
                <div class="drumroll">And in ${rank}${placementSuffix(
        rank
      )} place...</div>
            </div>
        `);

      // Reveal Slide
      const teamMembersHtml =
        project.teamMembers.length > 0
          ? `<p class="team-members">by ${escapeHtml(
              project.teamMembers.join(", ")
            )}</p>`
          : "";

      const imageContainerHtml = project.imageUrl
        ? `<div class="image-container"><img src="${escapeHtml(
            project.imageUrl
          )}" class="project-image" onerror="this.parentElement.style.display='none'"></div>`
        : "";

      slides.push(`
            <div class="slide reveal">
                <div class="reveal-content">
                    ${imageContainerHtml}
                    <div class="text-content">
                        <p class="placement">${rank}${placementSuffix(
        rank
      )} Place</p>
                        <h2 class="project-name">${escapeHtml(
                          project.projectName
                        )}</h2>
                        <h3 class="team-name">${escapeHtml(
                          project.teamName || project.projectName
                        )}</h3>
                        ${teamMembersHtml}
                    </div>
                </div>
            </div>
        `);
    }

    // Final "Thank You" slide
    slides.push(`
        <div class="slide final">
            <h1>Thank You!</h1>
            <p>${escapeHtml(settings.customMessage)}</p>
        </div>
    `);

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapeHtml(currentEventDetails.eventName)} - Awards</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    background-color: #111827; /* gray-900 */
                    color: #f9fafb; /* gray-50 */
                    font-family: 'Inter', sans-serif;
                    overflow: hidden;
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }
                .slide {
                    width: 100%;
                    height: 100%;
                    display: none;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    box-sizing: border-box;
                    padding: 4rem;
                    position: absolute;
                    top: 0;
                    left: 0;
                    opacity: 0;
                    transition: opacity 0.5s ease-in-out;
                }
                .slide.active {
                    display: flex;
                    opacity: 1;
                    z-index: 1;
                }
                .drumroll {
                    font-size: 6vw;
                    font-weight: 900;
                    animation: drumroll-text 2s ease-in-out infinite;
                }
                @keyframes drumroll-text {
                    0%, 100% { color: #f9fafb; }
                    50% { color: #c7d2fe; }
                }

                .reveal-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2rem;
                    width: 100%;
                    max-width: 1200px;
                }

                .image-container {
                    width: 60%;
                    max-width: 800px;
                    aspect-ratio: 16 / 9;
                    background-color: #1f2937;
                    border-radius: 1rem;
                    overflow: hidden;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.4);
                }
                .project-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .text-content {
                    text-align: center;
                }
                .placement {
                    font-size: 2.5vw;
                    font-weight: 700;
                    color: #a5b4fc; /* indigo-300 */
                }
                .project-name {
                    font-size: 5vw;
                    font-weight: 900;
                    margin: 0.5rem 0;
                }
                .team-name {
                    font-size: 3vw;
                    font-weight: 700;
                    color: #d1d5db; /* gray-300 */
                    margin: 0;
                }
                .team-members {
                    font-size: 1.8vw;
                    color: #9ca3af; /* gray-400 */
                    margin-top: 1rem;
                }
                .final h1 {
                    font-size: 8vw;
                    font-weight: 900;
                }
                .final p {
                    font-size: 3vw;
                    color: #d1d5db; /* gray-300 */
                }
                #progress-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    height: 8px;
                    background-color: #4f46e5;
                    transition: width 0.2s linear;
                    z-index: 10;
                }
            </style>
        </head>
        <body>
            ${slides.join("")}
            <div id="progress-bar"></div>
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const slides = document.querySelectorAll('.slide');
                    const progressBar = document.getElementById('progress-bar');
                    let currentSlide = 0;

                    function showSlide(index) {
                        slides.forEach((slide, i) => {
                            slide.classList.toggle('active', i === index);
                        });
                        updateProgressBar();
                    }
                    
                    function updateProgressBar() {
                        const progress = ((currentSlide + 1) / slides.length) * 100;
                        progressBar.style.width = progress + '%';
                    }

                    function nextSlide() {
                        if (currentSlide < slides.length - 1) {
                            currentSlide++;
                            showSlide(currentSlide);
                        }
                    }

                    function prevSlide() {
                        if (currentSlide > 0) {
                            currentSlide--;
                            showSlide(currentSlide);
                        }
                    }

                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'ArrowRight' || e.key === ' ') {
                            nextSlide();
                        } else if (e.key === 'ArrowLeft') {
                            prevSlide();
                        } else if (e.key === 'f') {
                            document.documentElement.requestFullscreen().catch(console.error);
                        } else if (e.key === 'Escape') {
                            if (document.fullscreenElement) {
                                document.exitFullscreen();
                            }
                        }
                    });

                    document.body.addEventListener('click', nextSlide);
                    
                    showSlide(0);
                });
            <\/script>
        </body>
        </html>
    `;
  }

  function setupAttendeesEventListeners() {
    const attendeeSearchInput = document.getElementById(
      "attendee-search-input"
    );
    if (!attendeeSearchInput) return;

    const filterAttendees = () => {
      const query = attendeeSearchInput.value.toLowerCase();
      const projectCards = document.querySelectorAll(
        "#project-teams-list > div"
      );
      const nonProjectCards = document.querySelectorAll(
        "#non-project-attendees-list > div"
      );

      projectCards.forEach((card) => {
        const teamNameEl = card.querySelector(".font-semibold.text-xl");
        const teamName = teamNameEl ? teamNameEl.textContent.toLowerCase() : "";
        let memberNamesAndEmails = "";
        const membersList = card.querySelectorAll("ul > li");
        membersList.forEach((li) => {
          memberNamesAndEmails += li.textContent.toLowerCase() + " ";
        });
        if (teamName.includes(query) || memberNamesAndEmails.includes(query)) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });

      nonProjectCards.forEach((card) => {
        const nameEl = card.querySelector(".font-bold.text-xl");
        const emailEl = card.querySelector(".text-gray-400.text-lg");
        const name = nameEl ? nameEl.textContent.toLowerCase() : "";
        const email = emailEl ? emailEl.textContent.toLowerCase() : "";
        if (name.includes(query) || email.includes(query)) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    };

    if (attendeeSearchInput) {
      attendeeSearchInput.addEventListener("input", filterAttendees);
    }

    document.querySelectorAll(".remove-attendee-btn").forEach((button) => {
      button.removeEventListener("click", handleRemoveButton);
      button.addEventListener("click", handleRemoveButton);
    });

    function handleRemoveButton(e) {
      const targetButton = e.target;
      const attendeeUserId = targetButton.dataset.userId;
      const attendeeEmail = targetButton.dataset.userEmail;
      const promptContainer = targetButton.closest(
        ".remove-attendee-prompt-container"
      );
      if (!promptContainer) return;

      const confirmationDiv = document.createElement("div");
      confirmationDiv.className = "flex flex-col gap-2";
      confirmationDiv.innerHTML = `
          <span class="text-red-400 text-sm">Choose an action:</span>
          <div class="flex flex-row gap-2">
              <button type="button" class="bg-red-600 px-2 py-1 text-sm text-white rounded-md ban-btn">Ban</button>
              <button type="button" class="bg-yellow-600 px-2 py-1 text-sm text-white rounded-md kick-btn">Kick</button>
              <button type="button" class="bg-gray-600 px-2 py-1 text-sm text-white rounded-md cancel-btn">Cancel</button>
          </div>
      `;

      promptContainer.innerHTML = "";
      promptContainer.appendChild(confirmationDiv);

      confirmationDiv
        .querySelector(".kick-btn")
        ?.addEventListener("click", async () => {
          const token = localStorage.getItem("podium-pro-organizer-token");
          try {
            const response = await fetch(
              "https://podium-d74a4f5f498c.herokuapp.com/api/remove-attendee-organizer",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  eventCode: currentEventDetails.eventCode,
                  attendeeUserId,
                }),
              }
            );

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            refreshCurrentPage();
          } catch (error) {
            alert(`Failed to kick attendee: ${escapeHtml(error.message)}`);
            restoreOriginalButton(
              promptContainer,
              attendeeUserId,
              attendeeEmail
            );
          }
        });

      confirmationDiv
        .querySelector(".ban-btn")
        ?.addEventListener("click", async () => {
          const token = localStorage.getItem("podium-pro-organizer-token");
          try {
            const banResponse = await fetch(
              "https://podium-d74a4f5f498c.herokuapp.com/api/add-ban",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  eventCode: currentEventDetails.eventCode,
                  email: attendeeEmail,
                }),
              }
            );
            const banData = await banResponse.json();
            if (!banResponse.ok) throw new Error(banData.message);

            const removeResponse = await fetch(
              "https://podium-d74a4f5f498c.herokuapp.com/api/remove-attendee-organizer",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  eventCode: currentEventDetails.eventCode,
                  attendeeUserId,
                }),
              }
            );
            const removeData = await removeResponse.json();
            if (!removeResponse.ok) throw new Error(removeData.message);

            refreshCurrentPage();
          } catch (error) {
            alert(`Failed to ban attendee: ${escapeHtml(error.message)}`);
            restoreOriginalButton(
              promptContainer,
              attendeeUserId,
              attendeeEmail
            );
          }
        });

      confirmationDiv
        .querySelector(".cancel-btn")
        ?.addEventListener("click", () => {
          restoreOriginalButton(promptContainer, attendeeUserId, attendeeEmail);
        });
    }

    function restoreOriginalButton(container, userId, email) {
      container.innerHTML = `
        <button type="button" class="bg-red-600/50 text-red-300 hover:bg-red-500/50 px-3 py-1 text-sm rounded-md transition remove-attendee-btn" data-user-id="${userId}" data-user-email="${email}">Remove</button>
      `;
      container
        .querySelector(".remove-attendee-btn")
        .addEventListener("click", handleRemoveButton);
    }
  }

  function setupBansEventListeners() {
    const addBanForm = document.getElementById("add-ban-form");
    const banEmailInput = document.getElementById("ban-email-input");
    const addBanButton = document.getElementById("add-ban-button");
    const addBanError = document.getElementById("add-ban-error");
    const bannedEmailsList = document.getElementById("banned-emails-list");

    if (addBanForm && banEmailInput && addBanButton) {
      addBanForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = banEmailInput.value.trim();
        const emailRegex =
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        addBanError.textContent = "";

        if (!email || !emailRegex.test(email)) {
          addBanError.textContent = "Please enter a valid email address.";
          return;
        }

        addBanButton.textContent = "Banning...";
        addBanButton.disabled = true;

        const token = localStorage.getItem("podium-pro-organizer-token");
        try {
          const response = await fetch(
            "https://podium-d74a4f5f498c.herokuapp.com/api/add-ban",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                eventCode: currentEventDetails.eventCode,
                email,
              }),
            }
          );
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);

          banEmailInput.value = "";
          refreshCurrentPage();
        } catch (error) {
          addBanError.textContent = `Failed to add ban: ${escapeHtml(
            error.message
          )}`;
        } finally {
          addBanButton.textContent = "Ban";
          addBanButton.disabled = false;
        }
      });
    }

    if (bannedEmailsList) {
      bannedEmailsList.addEventListener("click", (e) => {
        if (e.target.classList.contains("unban-btn")) {
          const targetButton = e.target;
          const emailToUnban = targetButton.dataset.email;
          const promptContainer = targetButton.closest(
            ".unban-prompt-container"
          );
          if (!promptContainer) return;
          const originalHtml = promptContainer.innerHTML;

          promptContainer.innerHTML = `
                    <span class="text-red-400 text-sm">Unban?</span>
                    <button type="button" class="bg-gray-600 px-2 py-1 text-sm text-white rounded-md ml-2 confirm-unban-btn">Yes</button>
                    <button type="button" class="bg-gray-600 px-2 py-1 text-sm text-white rounded-md ml-2 cancel-unban-btn">No</button>
                `;

          promptContainer
            .querySelector(".confirm-unban-btn")
            ?.addEventListener("click", async () => {
              const token = localStorage.getItem("podium-pro-organizer-token");
              try {
                const response = await fetch(
                  "https://podium-d74a4f5f498c.herokuapp.com/api/unban",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      token,
                      eventCode: currentEventDetails.eventCode,
                      email: emailToUnban,
                    }),
                  }
                );
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                refreshCurrentPage();
              } catch (error) {
                alert(`Failed to unban email: ${escapeHtml(error.message)}`);
                promptContainer.innerHTML = originalHtml;
              }
            });

          promptContainer
            .querySelector(".cancel-unban-btn")
            ?.addEventListener("click", () => {
              promptContainer.innerHTML = originalHtml;
            });
        }
      });
    }
  }

  function setupDangerZoneEventListeners(isCreator) {
    const eventNameConfirmInput = document.getElementById("event-name-confirm");
    const confirmCheckbox = document.getElementById("confirm-checkbox");
    const deleteButton = document.getElementById("delete-event-button");
    const deleteMessage = document.getElementById("delete-event-message");
    const eventNameError = document.getElementById("event-name-error");

    if (
      !eventNameConfirmInput ||
      !confirmCheckbox ||
      !deleteButton ||
      !deleteMessage ||
      !eventNameError
    ) {
      return;
    }

    const updateButtonState = () => {
      if (!isCreator) {
        return;
      }
      const isMatch =
        eventNameConfirmInput.value === currentEventDetails.eventName;
      const isChecked = confirmCheckbox.checked;

      deleteButton.disabled = !(isMatch && isChecked);
      if (deleteButton.disabled) {
        deleteButton.classList.add(
          "bg-red-900",
          "text-red-400",
          "cursor-not-allowed"
        );
        deleteButton.classList.remove("bg-red-600", "hover:bg-red-700");
      } else {
        deleteButton.classList.remove(
          "bg-red-900",
          "text-red-400",
          "cursor-not-allowed"
        );
        deleteButton.classList.add("bg-red-600", "hover:bg-red-700");
      }

      if (eventNameConfirmInput.value.length > 0 && !isMatch) {
        eventNameError.textContent =
          "Event name must match exactly (case-sensitive).";
      } else {
        eventNameError.textContent = "";
      }
    };

    if (isCreator) {
      eventNameConfirmInput.addEventListener("input", updateButtonState);
      confirmCheckbox.addEventListener("change", updateButtonState);
      updateButtonState();
    }

    deleteButton.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!deleteButton.disabled) {
        deleteButton.classList.add("hidden");
        const confirmationHtml = `
                <div id="delete-confirm-prompt" class="mt-4 text-center">
                    <p class="text-red-400">Are you sure?</p>
                    <div class="mt-2 flex justify-center space-x-4">
                        <button id="confirm-yes" type="button" class="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition">Yes</button>
                        <button id="confirm-no" type="button" class="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition">No</button>
                    </div>
                </div>
            `;
        deleteButton.insertAdjacentHTML("afterend", confirmationHtml);

        document
          .getElementById("confirm-yes")
          ?.addEventListener("click", async () => {
            const prompt = document.getElementById("delete-confirm-prompt");
            if (prompt)
              prompt.innerHTML = `<p class="text-red-400">Deleting...</p>`;

            const token = localStorage.getItem("podium-pro-organizer-token");
            try {
              const response = await fetch(
                "https://podium-d74a4f5f498c.herokuapp.com/api/delete-event",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token,
                    eventCode: currentEventDetails.eventCode,
                  }),
                }
              );

              const data = await response.json();
              if (!response.ok) throw new Error(data.message);

              if (prompt)
                prompt.innerHTML = `<p class="text-green-400">Event deleted successfully. Redirecting...</p>`;

              setTimeout(() => {
                localStorage.removeItem("podium-pro-organizer-token");
                window.location.replace("./");
              }, 2000);
            } catch (error) {
              if (prompt)
                prompt.innerHTML = `<p class="text-red-400">Error: ${escapeHtml(
                  error.message
                )}</p>`;
              if (deleteButton) deleteButton.classList.remove("hidden");
            }
          });

        document.getElementById("confirm-no")?.addEventListener("click", () => {
          document.getElementById("delete-confirm-prompt")?.remove();
          if (deleteButton) deleteButton.classList.remove("hidden");
          updateButtonState();
        });
      }
    });
  }

  checkLoginStatus();
});
