# JobBot: Automated Job Application Tracker

A full-stack automation tool that helps you search for jobs, filter them based on your preferences, submit simulated applications, track their status, and generate insights. Built as an Express.js monolith with a stunning dark-mode glassmorphism dashboard.

![JobBot Dashboard Preview](https://github.com/abhsksingh/jobBot/blob/main/public/images/preview.png?raw=true)

> **Note:** Job boards (LinkedIn, Indeed, etc.) strictly prohibit automated scraping/applying. This project uses a **simulated job search engine** backed by a realistic SQLite seed database for demonstration purposes. The architecture is designed so real API integrations can be plugged in later.

## 🚀 Features

- **Job Search Engine**: Browse 30+ seeded tech jobs. Filter by keyword, location, job type (Full-time, Contract, Internship), and salary range.
- **Application Tracking System (ATS)**: Manage your job applications across various stages (Applied → Screening → Interview → Offer → Rejected).
- **Auto-Apply**: Set up your preferences (desired roles, locations, minimum salary, key skills) and the bot will match and batch-apply to all fitting roles in one click.
- **Reports & Analytics**: Visualize your job search funnel with a donut chart, company/location bar graphs, and see your overall response rate. Export all applications to CSV.
- **Stunning UI**: A fully responsive vanilla HTML/CSS/JS frontend featuring a modern dark theme, glassmorphism cards, micro-animations, and dynamic SVG charts.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js |
| **Backend** | Express.js |
| **Database** | SQLite3 (`better-sqlite3` driver) |
| **Frontend** | Vanilla HTML, CSS variables, ES6 JavaScript |
| **Data Export** | `json2csv` |

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/abhsksingh/jobBot.git
   cd jobBot
   ```

2. **Install dependencies:**
   Make sure you have [Node.js](https://nodejs.org/) installed, then run:
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   *The database (`db/jobbot.db`) will be automatically created and populated with 30 seed jobs on the first run.*

4. **Access the Application:**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
jobBot/
├── db/
│   └── database.js         # SQLite connection & schema seeding logic
├── public/                 # Frontend SPA Assets
│   ├── css/
│   │   └── styles.css      # Core design system
│   ├── js/
│   │   └── app.js          # Client-side router & API calls
│   └── index.html          # HTML Shell
├── routes/                 # Express API Modules
│   ├── applications.js     # Application CRUD
│   ├── jobs.js             # Job Search & Filtering
│   ├── preferences.js      # Auto-Apply Logic & Preferences
│   └── reports.js          # Aggregation & CSV Export
├── server.js               # Express entry point
└── package.json            # Node.js dependencies
```

## 📝 Usage Guide

1. **Set Preferences**: Navigate to the "Preferences" tab to configure your ideal job specifications.
2. **Search & Apply**: Go to "Job Search", find roles you like, and hit "Apply Now" to add a custom cover letter, or use "Auto-Apply" from the Dashboard.
3. **Track Progress**: Use the "Applications" table to shift application statuses as you move through interview stages.
4. **View Insights**: Head to "Reports" to analyze your success rate.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
