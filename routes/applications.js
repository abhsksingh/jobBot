const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/applications — apply to a job
router.post('/', (req, res) => {
  const { jobId, coverLetter, notes } = req.body;

  if (!jobId) return res.status(400).json({ error: 'jobId is required' });

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const existing = db.prepare('SELECT * FROM applications WHERE job_id = ?').get(jobId);
  if (existing) return res.status(409).json({ error: 'Already applied to this job', application: existing });

  const result = db.prepare(`
    INSERT INTO applications (job_id, cover_letter, notes, status)
    VALUES (?, ?, ?, 'Applied')
  `).run(jobId, coverLetter || '', notes || '');

  const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(application);
});

// GET /api/applications — list all applications
router.get('/', (req, res) => {
  const { status, sort = 'applied_date', order = 'desc' } = req.query;

  let sql = `
    SELECT a.*, j.title as job_title, j.company, j.location, j.type as job_type,
           j.salary_min, j.salary_max, j.skills, j.url as job_url
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
  `;

  const params = [];
  if (status) {
    sql += ' WHERE a.status = ?';
    params.push(status);
  }

  const validSorts = ['applied_date', 'updated_date', 'status'];
  const sortCol = validSorts.includes(sort) ? `a.${sort}` : 'a.applied_date';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${sortCol} ${sortOrder}`;

  const applications = db.prepare(sql).all(...params);

  const enriched = applications.map(app => ({
    ...app,
    skills: app.skills ? app.skills.split(',') : []
  }));

  res.json(enriched);
});

// PATCH /api/applications/:id — update status
router.patch('/:id', (req, res) => {
  const { status, notes } = req.body;
  const validStatuses = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const updates = [];
  const params = [];

  if (status) { updates.push('status = ?'); params.push(status); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  updates.push("updated_date = datetime('now')");

  params.push(req.params.id);
  db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(`
    SELECT a.*, j.title as job_title, j.company, j.location, j.type as job_type,
           j.salary_min, j.salary_max, j.skills, j.url as job_url
    FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.id = ?
  `).get(req.params.id);

  updated.skills = updated.skills ? updated.skills.split(',') : [];
  res.json(updated);
});

// DELETE /api/applications/:id — withdraw
router.delete('/:id', (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  res.json({ message: 'Application withdrawn', id: Number(req.params.id) });
});

module.exports = router;
