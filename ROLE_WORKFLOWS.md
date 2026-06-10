# TaskFlow - Role Workflows & Permissions 

TaskFlow is built around a secure **Workspace-based Architecture**. Every feature, task, and note belongs to a specific workspace, and access is tightly regulated by a user's role within that workspace. 

This document outlines the capabilities and standard workflows for the two primary roles: **Admin** and **Member**.

---

## 👑 Admin Workflow

The Admin is the owner or manager of a Workspace. They have full structural oversight, meaning they manage not only the data within the workspace but the workspace environment itself.

### 1. Workspace Creation & Configuration
* **Initialization:** An Admin flow begins when a user creates a new Workspace via the Workspace Switcher or Dashboard. By default, the creator is granted the `ADMIN` role.
* **Management:** They can rename the workspace, set up Custom Fields, and define Recurring Task templates (if applicable).

### 2. Team Management (Access Control)
* **Inviting Members:** Admins have exclusive access to the **"Manage Team"** page. They generate secure, tokenized invitation links through the email system to onboard new collaborators.
* **Role Adjustments:** As the team grows, an Admin can promote a Member to an Admin, or demote an Admin back to a regular Member.
* **Revoking Access:** If someone leaves the team, the Admin can safely remove them from the Workspace. This immediately cuts off the user's access to the workspace data without affecting the user's overarching account.

### 3. Task & Project Oversight
* **Global Task Access:** Admins can view, edit, and delete *any* task in the workspace.
* **Delegation:** They can assign tasks to specific team members, setting deadlines, priorities, and workflow categories.
* **Analytics:** They have full access to high-level system analytics (e.g., Burn-down charts, user contribution heatmaps) to assess team health and bottlenecks.

---

## 👩‍💻 Member Workflow

The Member role is designed to be focused and frictionless. Members are standard contributors who need the ability to execute their work efficiently without worrying about administrative overhead or accidentally modifying overarching settings.

### 1. Onboarding & Access
* **Joining:** A Member's workflow starts by accepting an email invitation link sent by an Admin. Accepting the invite authenticates them and seamlessly binds their account to the Workspace.
* **Multi-Workspace Efficiency:** Members can be part of multiple workspaces simultaneously (e.g., "Engineering Team" and "Company All-Hands") and can toggle between them instantly without re-authenticating.

### 2. Execution & Collaboration
* **Task Management:** Members can view all tasks within their shared workspace. They can create new tasks and update statuses (e.g., moving a task from "In Progress" to "Completed").
* **Restricted Deletion:** To prevent accidental data loss, Members *cannot* delete tasks created by other users—they can only edit the necessary fields to keep work moving or delete tasks they created themselves.
* **Communication:** Members can leave rich-text comments, tag other users in task threads, and upload attachments to active workspaces.

### 3. Visibility Restrictions
* Members **cannot** access the "Manage Team" settings.
* Members **cannot** invite new users to the workspace.
* Members **cannot** alter global workspace configurations (like workflow statuses or global tags).

---

## 🔄 Interaction Flow Example

Here is how Admins and Members interact in a typical day-to-day scenario:

1. **Admin** creates a new workspace called `"Q3 Marketing Launch"`.
2. **Admin** goes to 'Manage Team' and invites three copywriters via email.
3. **Members** click the email link, sign in, and automatically land in the `"Q3 Marketing Launch"` dashboard.
4. **Admin** bulk-creates tasks using a custom template and assigns them to the various **Members**.
5. **Members** receive a notification (via the Notification Bell) that tasks have been assigned to them.
6. **Member A** begins work, updates the task status to *In Progress*, and adds a comment `@Admin, the draft is ready for review.`
7. **Admin** is notified of the highlight, reviews the progress on the Analytics page, and moves the task to *Completed*. 

---

### Security Note
Access control is enforced at both the **Frontend** (UI elements like the "Manage Team" button are completely hidden from Members) and the **Backend** (API routes check permissions via the `attachWorkspace` and `authorizeRole` middleware before returning any database results or executing actions).
