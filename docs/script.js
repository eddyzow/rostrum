$(document).ready(function () {
  const socket = io();

  // --- Fetch and Display Projects ---
  function loadProjects() {
    $.get("/api/projects", function (projects) {
      $("#project-list").empty();
      projects.forEach(function (project) {
        addProjectToList(project);
      });
    });
  }

  function addProjectToList(project) {
    $("#project-list").append(`
            <div class="project-item border p-4 rounded-lg flex justify-between items-center" id="project-${project._id}">
                <div>
                    <h3 class="text-xl font-bold">${project.name}</h3>
                    <p class="text-gray-600">${project.description}</p>
                </div>
                <div class="text-right">
                     <button class="vote-btn bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" data-id="${project._id}">
                        Vote
                    </button>
                    <span class="vote-count text-2xl font-bold ml-4">${project.votes}</span>
                </div>
            </div>
        `);
  }

  // --- Form Submission ---
  $("#project-form").on("submit", function (e) {
    e.preventDefault();
    const newProject = {
      name: $("#projectName").val(),
      description: $("#projectDesc").val(),
    };

    $.ajax({
      url: "/api/projects",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(newProject),
      success: function () {
        // The socket event will handle adding the project to the list
        $("#projectName").val("");
        $("#projectDesc").val("");
      },
    });
  });

  // --- Handle Voting ---
  $("#project-list").on("click", ".vote-btn", function () {
    const projectId = $(this).data("id");
    socket.emit("vote", projectId);
  });

  // --- Socket.io Listeners ---
  socket.on("project-added", function (project) {
    addProjectToList(project);
  });

  socket.on("vote-update", function (updatedProject) {
    const projectElement = $(`#project-${updatedProject._id}`);
    projectElement.find(".vote-count").text(updatedProject.votes);
  });

  // --- Initial Load ---
  loadProjects();
});
