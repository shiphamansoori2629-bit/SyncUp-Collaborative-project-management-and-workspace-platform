# 🚀 SyncUp - Collaborative Project Management & Workspace Platform

SyncUp is a modern, production-ready full-stack workspace solution designed to optimize team workflows, track focus sessions, and manage tasks efficiently. It bridges the gap between agile project management and smart developer analytics to maximize output and prevent burnout.

---

## ✨ Key Features

- **📊 Modern Kanban Workspace:** Interactive drag-and-drop boards to track tasks across Custom, In-Progress, and Completed states.
- **⏱️ Smart Focus Tracker:** Pomodoro-style focus sessions equipped with **Idle Detection** to ensure authentic time-tracking.
- **💻 Virtual Workspace Hub:** A unified dashboard integrating environment spaces for Coding, Designing, and Documentation[cite: 1].
- **🔒 Secure Authentication:** Handled via **Clerk UI** for secure, seamless multi-tenant user authentication and registration[cite: 1].
- **📈 Productivity Analytics:** Visual charts and metrics depicting total tasks, overdue timelines, and completed sessions[cite: 1].

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js with TypeScript[cite: 1]
- **Styling:** Tailwind CSS[cite: 1]
- **Authentication:** Clerk UI[cite: 1]

### Backend
- **Framework:** FastAPI (Python)[cite: 1]
- **Database ORM:** SQLModel / SQLAlchemy[cite: 1]
- **Database:** PostgreSQL[cite: 1]

---

## ⚙️ Installation & Setup

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn main:app --reload
Backend will be live at http://localhost:8000
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the local development server
npm run dev
Frontend will be live at http://localhost:5173
