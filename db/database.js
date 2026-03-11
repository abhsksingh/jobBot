const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'jobbot.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    company      TEXT NOT NULL,
    location     TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'Full-time',
    salary_min   INTEGER,
    salary_max   INTEGER,
    description  TEXT,
    skills       TEXT,
    posted_date  TEXT DEFAULT (date('now')),
    url          TEXT,
    source       TEXT DEFAULT 'Internal'
  );

  CREATE TABLE IF NOT EXISTS applications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id        INTEGER NOT NULL,
    status        TEXT NOT NULL DEFAULT 'Applied',
    cover_letter  TEXT,
    applied_date  TEXT DEFAULT (datetime('now')),
    updated_date  TEXT DEFAULT (datetime('now')),
    notes         TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS preferences (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    desired_roles   TEXT DEFAULT '[]',
    desired_locations TEXT DEFAULT '[]',
    salary_min      INTEGER DEFAULT 0,
    salary_max      INTEGER DEFAULT 999999,
    desired_skills  TEXT DEFAULT '[]',
    job_types       TEXT DEFAULT '["Full-time"]',
    auto_apply      INTEGER DEFAULT 0,
    updated_date    TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);
  CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
  CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
  CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
`);

// ── Seed default preferences ─────────────────────────────────────────────────

const prefCount = db.prepare('SELECT COUNT(*) as c FROM preferences').get();
if (prefCount.c === 0) {
  db.prepare(`
    INSERT INTO preferences (id, desired_roles, desired_locations, salary_min, salary_max, desired_skills, job_types)
    VALUES (1, '["Software Engineer","Frontend Developer","Backend Developer","Full Stack Developer"]',
               '["Remote","San Francisco, CA","New York, NY","Austin, TX"]',
               80000, 200000,
               '["JavaScript","Python","React","Node.js","SQL"]',
               '["Full-time","Contract"]')
  `).run();
}

// ── Seed jobs ────────────────────────────────────────────────────────────────

const jobCount = db.prepare('SELECT COUNT(*) as c FROM jobs').get();
if (jobCount.c === 0) {
  const seedJobs = [
    { title: 'Senior Frontend Engineer', company: 'TechNova Inc.', location: 'Remote', type: 'Full-time', salary_min: 140000, salary_max: 180000, description: 'Build beautiful, performant web applications using React and TypeScript. Lead frontend architecture decisions and mentor junior developers.', skills: 'React,TypeScript,CSS,GraphQL,Jest', url: 'https://technova.jobs/senior-frontend' },
    { title: 'Backend Developer', company: 'DataStream Corp', location: 'San Francisco, CA', type: 'Full-time', salary_min: 130000, salary_max: 170000, description: 'Design and implement scalable microservices using Node.js and Python. Work with distributed systems and cloud infrastructure.', skills: 'Node.js,Python,AWS,PostgreSQL,Docker', url: 'https://datastream.careers/backend-dev' },
    { title: 'Full Stack Developer', company: 'CloudPeak Solutions', location: 'New York, NY', type: 'Full-time', salary_min: 120000, salary_max: 160000, description: 'Work across the entire stack building SaaS products. Collaborate closely with product and design teams.', skills: 'JavaScript,React,Node.js,MongoDB,AWS', url: 'https://cloudpeak.io/fullstack' },
    { title: 'Software Engineer II', company: 'Quantum Labs', location: 'Austin, TX', type: 'Full-time', salary_min: 125000, salary_max: 165000, description: 'Join our core platform team to build developer tools and APIs. Strong focus on code quality and testing.', skills: 'Python,Go,Kubernetes,gRPC,SQL', url: 'https://quantumlabs.dev/swe2' },
    { title: 'React Developer', company: 'PixelForge Studio', location: 'Remote', type: 'Contract', salary_min: 90000, salary_max: 130000, description: 'Create pixel-perfect UIs for our design system. Deep understanding of React patterns and state management required.', skills: 'React,Redux,Storybook,CSS-in-JS,Testing Library', url: 'https://pixelforge.studio/react-dev' },
    { title: 'DevOps Engineer', company: 'InfraScale', location: 'Seattle, WA', type: 'Full-time', salary_min: 135000, salary_max: 175000, description: 'Build and maintain CI/CD pipelines, manage cloud infrastructure, and ensure 99.99% uptime for production systems.', skills: 'AWS,Terraform,Docker,Kubernetes,Python', url: 'https://infrascale.com/devops' },
    { title: 'Machine Learning Engineer', company: 'NeuralPath AI', location: 'San Francisco, CA', type: 'Full-time', salary_min: 160000, salary_max: 220000, description: 'Develop and deploy ML models at scale. Work on NLP, computer vision, and recommendation systems.', skills: 'Python,PyTorch,TensorFlow,MLOps,SQL', url: 'https://neuralpath.ai/ml-eng' },
    { title: 'Junior Software Developer', company: 'CodeCraft Studios', location: 'Austin, TX', type: 'Full-time', salary_min: 70000, salary_max: 95000, description: 'Great opportunity for early-career developers. Mentorship program, pair programming, and hands-on learning.', skills: 'JavaScript,HTML,CSS,Git,Node.js', url: 'https://codecraft.dev/junior-dev' },
    { title: 'Platform Engineer', company: 'ScaleUp Systems', location: 'Remote', type: 'Full-time', salary_min: 150000, salary_max: 190000, description: 'Design and build internal developer platforms. Improve developer experience and deployment velocity.', skills: 'Go,Kubernetes,Terraform,AWS,CI/CD', url: 'https://scaleup.systems/platform-eng' },
    { title: 'Frontend Developer', company: 'BrightUI Labs', location: 'Denver, CO', type: 'Full-time', salary_min: 100000, salary_max: 140000, description: 'Build accessible, responsive web applications. Strong focus on performance and user experience.', skills: 'JavaScript,React,Vue.js,CSS,Accessibility', url: 'https://brightui.com/frontend' },
    { title: 'Data Engineer', company: 'PipelineIO', location: 'New York, NY', type: 'Full-time', salary_min: 130000, salary_max: 170000, description: 'Build ETL pipelines and data warehouses. Work with petabyte-scale datasets using modern data stack.', skills: 'Python,SQL,Spark,Airflow,dbt', url: 'https://pipelineio.com/data-eng' },
    { title: 'Mobile Developer (React Native)', company: 'AppVenture', location: 'Remote', type: 'Contract', salary_min: 95000, salary_max: 135000, description: 'Build cross-platform mobile apps for iOS and Android using React Native. Focus on smooth animations and native feel.', skills: 'React Native,JavaScript,TypeScript,iOS,Android', url: 'https://appventure.dev/mobile' },
    { title: 'Security Engineer', company: 'CyberShield Corp', location: 'Washington, DC', type: 'Full-time', salary_min: 140000, salary_max: 185000, description: 'Identify and fix security vulnerabilities. Conduct penetration testing and security audits.', skills: 'Security,Python,AWS,Networking,Compliance', url: 'https://cybershield.com/security-eng' },
    { title: 'API Developer', company: 'ConnectHub', location: 'Chicago, IL', type: 'Full-time', salary_min: 110000, salary_max: 145000, description: 'Design and build RESTful and GraphQL APIs. Focus on developer experience, documentation, and reliability.', skills: 'Node.js,GraphQL,REST,PostgreSQL,OpenAPI', url: 'https://connecthub.io/api-dev' },
    { title: 'Site Reliability Engineer', company: 'UptimeForce', location: 'Remote', type: 'Full-time', salary_min: 145000, salary_max: 195000, description: 'Keep critical systems running. On-call rotation, incident response, and proactive reliability improvements.', skills: 'Linux,Python,Prometheus,Grafana,Kubernetes', url: 'https://uptimeforce.com/sre' },
    { title: 'TypeScript Developer', company: 'TypeSafe Inc.', location: 'Portland, OR', type: 'Full-time', salary_min: 115000, salary_max: 155000, description: 'Build type-safe applications end-to-end. Strong TypeScript expertise and functional programming knowledge.', skills: 'TypeScript,Node.js,React,PostgreSQL,FP', url: 'https://typesafe.dev/ts-dev' },
    { title: 'Cloud Architect', company: 'SkyScale Technologies', location: 'San Francisco, CA', type: 'Full-time', salary_min: 170000, salary_max: 230000, description: 'Design multi-cloud architectures for enterprise clients. Deep expertise in AWS, Azure, or GCP required.', skills: 'AWS,Azure,GCP,Terraform,Architecture', url: 'https://skyscale.tech/cloud-architect' },
    { title: 'QA Automation Engineer', company: 'TestDrive Labs', location: 'Austin, TX', type: 'Full-time', salary_min: 95000, salary_max: 130000, description: 'Build comprehensive test automation frameworks. Selenium, Cypress, and API testing experience needed.', skills: 'Selenium,Cypress,JavaScript,Python,CI/CD', url: 'https://testdrive.labs/qa-auto' },
    { title: 'Blockchain Developer', company: 'ChainForge', location: 'Remote', type: 'Contract', salary_min: 150000, salary_max: 200000, description: 'Develop smart contracts and dApps on Ethereum and Solana. Deep understanding of DeFi protocols.', skills: 'Solidity,Rust,Web3.js,Ethereum,DeFi', url: 'https://chainforge.io/blockchain-dev' },
    { title: 'Technical Lead', company: 'VanguardTech', location: 'New York, NY', type: 'Full-time', salary_min: 180000, salary_max: 240000, description: 'Lead a team of 8 engineers building fintech products. Strong leadership, architecture, and hands-on coding skills.', skills: 'JavaScript,Python,Leadership,System Design,AWS', url: 'https://vanguardtech.com/tech-lead' },
    { title: 'Python Developer', company: 'PyWorks', location: 'Remote', type: 'Full-time', salary_min: 110000, salary_max: 150000, description: 'Build data processing pipelines and automation tools using Python. Django/Flask web development experience a plus.', skills: 'Python,Django,Flask,SQL,Redis', url: 'https://pyworks.io/python-dev' },
    { title: 'UI/UX Engineer', company: 'DesignFlow', location: 'Los Angeles, CA', type: 'Full-time', salary_min: 105000, salary_max: 145000, description: 'Bridge the gap between design and engineering. Build interactive prototypes and polished production UIs.', skills: 'React,Figma,CSS,Animation,Accessibility', url: 'https://designflow.co/uiux-eng' },
    { title: 'Infrastructure Engineer', company: 'BaseLayer', location: 'Seattle, WA', type: 'Full-time', salary_min: 140000, salary_max: 180000, description: 'Manage bare-metal and cloud infrastructure. Experience with networking, storage, and compute at scale.', skills: 'Linux,Ansible,Terraform,Networking,Python', url: 'https://baselayer.com/infra-eng' },
    { title: 'Golang Developer', company: 'GoStream', location: 'Remote', type: 'Full-time', salary_min: 130000, salary_max: 175000, description: 'Build high-performance backend services in Go. Microservices architecture and distributed systems experience.', skills: 'Go,gRPC,PostgreSQL,Docker,Kubernetes', url: 'https://gostream.dev/golang-dev' },
    { title: 'Staff Engineer', company: 'MegaCorp Technologies', location: 'San Francisco, CA', type: 'Full-time', salary_min: 200000, salary_max: 280000, description: 'Drive technical strategy across multiple teams. Solve the hardest technical problems and raise the engineering bar.', skills: 'System Design,Leadership,Java,Python,AWS', url: 'https://megacorp.tech/staff-eng' },
    { title: 'Frontend Intern', company: 'LearnCode Academy', location: 'Remote', type: 'Internship', salary_min: 40000, salary_max: 55000, description: 'Summer internship for students. Learn modern frontend development with mentorship from senior engineers.', skills: 'HTML,CSS,JavaScript,React,Git', url: 'https://learncode.academy/intern' },
    { title: 'Database Administrator', company: 'DataVault Systems', location: 'Chicago, IL', type: 'Full-time', salary_min: 115000, salary_max: 155000, description: 'Manage and optimize PostgreSQL and MySQL databases. Performance tuning, replication, and disaster recovery.', skills: 'PostgreSQL,MySQL,SQL,Linux,Performance', url: 'https://datavault.systems/dba' },
    { title: 'Embedded Systems Engineer', company: 'IoTech Devices', location: 'San Jose, CA', type: 'Full-time', salary_min: 125000, salary_max: 165000, description: 'Develop firmware for IoT devices. C/C++ programming and RTOS experience required.', skills: 'C,C++,RTOS,Embedded,IoT', url: 'https://iotech.devices/embedded-eng' },
    { title: 'Solutions Architect', company: 'CloudBridge Consulting', location: 'Remote', type: 'Contract', salary_min: 160000, salary_max: 210000, description: 'Design technical solutions for enterprise clients. Pre-sales support and architecture consulting.', skills: 'AWS,Architecture,Consulting,Python,Integration', url: 'https://cloudbridge.consulting/solutions-arch' },
    { title: 'Node.js Developer', company: 'ServerSide Labs', location: 'Austin, TX', type: 'Full-time', salary_min: 105000, salary_max: 140000, description: 'Build RESTful APIs and real-time applications with Node.js. Experience with Express, Socket.io, and message queues.', skills: 'Node.js,Express,MongoDB,Redis,Socket.io', url: 'https://serverside.labs/nodejs-dev' }
  ];

  const insert = db.prepare(`
    INSERT INTO jobs (title, company, location, type, salary_min, salary_max, description, skills, url)
    VALUES (@title, @company, @location, @type, @salary_min, @salary_max, @description, @skills, @url)
  `);

  const insertMany = db.transaction((jobs) => {
    for (const job of jobs) insert.run(job);
  });

  insertMany(seedJobs);
  console.log(`✅ Seeded ${seedJobs.length} jobs into the database.`);
}

module.exports = db;
