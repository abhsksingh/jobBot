const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/jobs — search & filter jobs
router.get('/', (req, res) => {
  const { keyword, location, type, salary_min, salary_max, skills, page = 1, limit = 20 } = req.query;

  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];

  if (keyword) {
    sql += ' AND (title LIKE ? OR company LIKE ? OR description LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }

  if (location) {
    sql += ' AND location LIKE ?';
    params.push(`%${location}%`);
  }

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  if (salary_min) {
    sql += ' AND salary_max >= ?';
    params.push(Number(salary_min));
  }

  if (salary_max) {
    sql += ' AND salary_min <= ?';
    params.push(Number(salary_max));
  }

  if (skills) {
    const skillList = skills.split(',');
    const skillClauses = skillList.map(() => 'skills LIKE ?');
    sql += ` AND (${skillClauses.join(' OR ')})`;
    skillList.forEach(s => params.push(`%${s.trim()}%`));
  }

  sql += ' ORDER BY posted_date DESC';

  const offset = (Number(page) - 1) * Number(limit);
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;

  sql += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const jobs = db.prepare(sql).all(...params);

  // Check which jobs already have applications
  const appliedJobIds = db.prepare('SELECT DISTINCT job_id FROM applications').all().map(r => r.job_id);

  const enrichedJobs = jobs.map(job => ({
    ...job,
    skills: job.skills ? job.skills.split(',') : [],
    applied: appliedJobIds.includes(job.id)
  }));

  res.json({ jobs: enrichedJobs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
});

// GET /api/jobs/:id — single job
router.get('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  job.skills = job.skills ? job.skills.split(',') : [];
  const application = db.prepare('SELECT * FROM applications WHERE job_id = ?').get(job.id);
  job.application = application || null;

  res.json(job);
});

module.exports = router;
