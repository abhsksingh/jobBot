const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/preferences
router.get('/', (req, res) => {
  const prefs = db.prepare('SELECT * FROM preferences WHERE id = 1').get();
  if (!prefs) return res.status(404).json({ error: 'No preferences set' });

  res.json({
    ...prefs,
    desired_roles: JSON.parse(prefs.desired_roles),
    desired_locations: JSON.parse(prefs.desired_locations),
    desired_skills: JSON.parse(prefs.desired_skills),
    job_types: JSON.parse(prefs.job_types),
    auto_apply: Boolean(prefs.auto_apply)
  });
});

// PUT /api/preferences
router.put('/', (req, res) => {
  const { desired_roles, desired_locations, salary_min, salary_max, desired_skills, job_types, auto_apply } = req.body;

  db.prepare(`
    UPDATE preferences SET
      desired_roles = ?,
      desired_locations = ?,
      salary_min = ?,
      salary_max = ?,
      desired_skills = ?,
      job_types = ?,
      auto_apply = ?,
      updated_date = datetime('now')
    WHERE id = 1
  `).run(
    JSON.stringify(desired_roles || []),
    JSON.stringify(desired_locations || []),
    salary_min || 0,
    salary_max || 999999,
    JSON.stringify(desired_skills || []),
    JSON.stringify(job_types || ['Full-time']),
    auto_apply ? 1 : 0
  );

  const updated = db.prepare('SELECT * FROM preferences WHERE id = 1').get();
  res.json({
    ...updated,
    desired_roles: JSON.parse(updated.desired_roles),
    desired_locations: JSON.parse(updated.desired_locations),
    desired_skills: JSON.parse(updated.desired_skills),
    job_types: JSON.parse(updated.job_types),
    auto_apply: Boolean(updated.auto_apply)
  });
});

// POST /api/auto-apply — auto-apply to matching jobs
router.post('/auto-apply', (req, res) => {
  const prefs = db.prepare('SELECT * FROM preferences WHERE id = 1').get();
  if (!prefs) return res.status(400).json({ error: 'Set preferences first' });

  const roles = JSON.parse(prefs.desired_roles);
  const locations = JSON.parse(prefs.desired_locations);
  const skills = JSON.parse(prefs.desired_skills);
  const types = JSON.parse(prefs.job_types);

  // Build dynamic query for matching jobs
  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];

  // Match roles (title contains any desired role keyword)
  if (roles.length > 0) {
    const roleClauses = roles.map(() => 'title LIKE ?');
    sql += ` AND (${roleClauses.join(' OR ')})`;
    roles.forEach(r => params.push(`%${r}%`));
  }

  // Match locations
  if (locations.length > 0) {
    const locClauses = locations.map(() => 'location LIKE ?');
    sql += ` AND (${locClauses.join(' OR ')})`;
    locations.forEach(l => params.push(`%${l}%`));
  }

  // Match salary range
  if (prefs.salary_min) {
    sql += ' AND salary_max >= ?';
    params.push(prefs.salary_min);
  }
  if (prefs.salary_max && prefs.salary_max < 999999) {
    sql += ' AND salary_min <= ?';
    params.push(prefs.salary_max);
  }

  // Match job types
  if (types.length > 0) {
    const typePlaceholders = types.map(() => '?').join(',');
    sql += ` AND type IN (${typePlaceholders})`;
    types.forEach(t => params.push(t));
  }

  const matchingJobs = db.prepare(sql).all(...params);

  // Filter out already-applied jobs
  const appliedIds = db.prepare('SELECT DISTINCT job_id FROM applications').all().map(r => r.job_id);
  const newJobs = matchingJobs.filter(j => !appliedIds.includes(j.id));

  // Apply to each matching job
  const insert = db.prepare(`
    INSERT INTO applications (job_id, cover_letter, notes, status)
    VALUES (?, ?, ?, 'Applied')
  `);

  const applyAll = db.transaction((jobs) => {
    const results = [];
    for (const job of jobs) {
      const coverLetter = `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${job.title} position at ${job.company}. With my experience and skills, I believe I would be a valuable addition to your team.\n\nBest regards`;
      const result = insert.run(job.id, coverLetter, 'Auto-applied based on preferences');
      results.push({ jobId: job.id, applicationId: result.lastInsertRowid, title: job.title, company: job.company });
    }
    return results;
  });

  const applied = applyAll(newJobs);

  res.json({
    message: `Auto-applied to ${applied.length} jobs`,
    totalMatching: matchingJobs.length,
    alreadyApplied: matchingJobs.length - newJobs.length,
    newApplications: applied.length,
    applications: applied
  });
});

module.exports = router;
