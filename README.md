# Podium Pro
A next-generation hackathon peer judging platform. Create events, add projects, and vote fairly in a manner that prioritizes fairness. Projects are shown randomly to prevent bias, and the UI/UX are designed to make the experience all in all much easier for the user. The voting system is based on an ELO rating system that prevents ties and is easy, fast, and fun to use. 

## Features

### For Organizers
- **Secure Organizer Portal:** Separate, secure login for event staff.
- **Event Management:** Create and manage multiple events from a central dashboard.
- **Project Approval System:** Review submitted projects, approve them for voting, or send them back with feedback for revision.
- **Live Voting Results:** A real-time dashboard showing project rankings based on their calculated Elo score, voter leaderboards, and overall ranking confidence metrics.
- **User Management:** View all attendees, manage project teams, and ban malicious users if necessary.
- **Customizable Awards Slideshow:** Generate and launch a dynamic, fullscreen awards ceremony slideshow (Top 3, 5, or 10) with custom messaging.

<table>
  <tr>
    <td align="center" valign="top">
      <img width="300" alt="Organizer dashboard for managing events" src="https://github.com/user-attachments/assets/3db651a7-da1a-461d-a18c-1211651f9442">
      <br>
      <em>The main organizer dashboard.</em>
    </td>
    <td align="center" valign="top">
      <img width="300" alt="Organizer's project review and management panel" src="https://github.com/user-attachments/assets/b9c067db-9778-439e-a2cb-a451cdf36613">
      <br>
      <em>Project review and status management.</em>
    </td>
     <td align="center" valign="top">
      <img width="300" alt="Live voting results and leaderboard" src="https://github.com/user-attachments/assets/53d8f335-8182-47cd-a57f-ff43c7a0ecb8">
      <br>
      <em>Live voting results dashboard.</em>
    </td>
  </tr>
</table>

### For Attendees
- **Magic Link Authentication:** Secure, passwordless login via email.
- **Project Submission:** A simple interface to create a project, add details (description, demo/repo URLs, image), and manage team members.
- **Team Management:** Project creators can add teammates by email, or members can join a team using a unique project code.
- **Peer-to-Peer Voting:** An engaging, side-by-side voting portal where attendees judge two projects at a time, using a slider to indicate the winner and the margin of victory.
- **Real-time Status Updates:** The dashboard automatically reflects project status changes (e.g., "Approved") and organizer notes.

<table>
  <tr>
    <td align="center" valign="top">
      <img width="450" alt="Attendee project management dashboard" src="https://github.com/user-attachments/assets/946d64a9-51bf-4156-8be6-874a3078e7d5">
      <br>
      <em>The attendee dashboard for project and team management.</em>
    </td>
    <td align="center" valign="top">
      <img width="450" alt="Side-by-side peer voting interface" src="https://github.com/user-attachments/assets/42cde506-e75c-48bd-b3a7-4312e04f9f17">
      <br>
      <em>The engaging side-by-side voting interface.</em>
    </td>
  </tr>
</table>

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (with MongoDB Atlas)
- **Authentication:** JSON Web Tokens (JWT) for magic links and session management.
- **Email:** Nodemailer for sending magic links.
- **Frontend:** Vanilla HTML, CSS, and JavaScript (no frameworks).
