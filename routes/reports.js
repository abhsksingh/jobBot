const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/reports/summary — dashboard statistics
router.get('/summary', (req, res) => {
  const totalJobs = db.prepare('SELECT COUNT(*) as c FROM jobs').get().c;
  const totalApplications = db.prepare('SELECT COUNT(*) as c FROM applications').get().c;

  const statusBreakdown = db.prepare(`
    SELECT status, COUNT(*) as count FROM applications GROUP BY status
  `).all();

  const statusMap = {};
  statusBreakdown.forEach(s => { statusMap[s.status] = s.count; });

  const avgSalary = db.prepare(`
    SELECT AVG((j.salary_min + j.salary_max) / 2.0) as avg_salary
    FROM applications a JOIN jobs j ON a.job_id = j.id
  `).get();

  const topCompanies = db.prepare(`
    SELECT j.company, COUNT(*) as count
    FROM applications a JOIN jobs j ON a.job_id = j.id
    GROUP BY j.company ORDER BY count DESC LIMIT 5
  `).all();

  const topLocations = db.prepare(`
    SELECT j.location, COUNT(*) as count
    FROM applications a JOIN jobs j ON a.job_id = j.id
    GROUP BY j.location ORDER BY count DESC LIMIT 5
  `).all();

  const responseRate = totalApplications > 0
    ? ((statusMap['Interview'] || 0) + (statusMap['Screening'] || 0) + (statusMap['Offer'] || 0)) / totalApplications * 100
    : 0;

  res.json({
    totalJobs,
    totalApplications,
    statusBreakdown: statusMap,
    averageSalary: Math.round(avgSalary.avg_salary || 0),
    responseRate: Math.round(responseRate * 10) / 10,
    topCompanies,
    topLocations
  });
});

// GET /api/reports/timeline — application activity over time
router.get('/timeline', (req, res) => {
  const timeline = db.prepare(`
    SELECT date(applied_date) as date, COUNT(*) as count
    FROM applications
    GROUP BY date(applied_date)
    ORDER BY date ASC
  `).all();

  const statusTimeline = db.prepare(`
    SELECT date(updated_date) as date, status, COUNT(*) as count
    FROM applications
    GROUP BY date(updated_date), status
    ORDER BY date ASC
  `).all();

  res.json({ timeline, statusTimeline });
});

// GET /api/reports/export — export as CSV
router.get('/export', (req, res) => {
  const { Parser } = require('json2csv');

  const applications = db.prepare(`
    SELECT a.id, j.title as job_title, j.company, j.location, j.type as job_type,
           j.salary_min, j.salary_max, a.status, a.applied_date, a.updated_date, a.notes, j.url as job_url
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    ORDER BY a.applied_date DESC
  `).all();

  if (applications.length === 0) {
    return res.status(404).json({ error: 'No applications to export' });
  }

  const fields = ['id', 'job_title', 'company', 'location', 'job_type', 'salary_min', 'salary_max', 'status', 'applied_date', 'updated_date', 'notes', 'job_url'];
  const parser = new Parser({ fields });
  const csv = parser.parse(applications);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=applications_export.csv');
  res.send(csv);
});

module.exports = router;
