const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// List all projects the current user is a member of or owns
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        pm.role as my_role
      FROM projects p
      JOIN users u ON u.id = p.owner_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      WHERE p.owner_id = $1 OR pm.user_id = $1
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project with members and stats
router.get('/:id', async (req, res) => {
  try {
    const proj = await pool.query(`
      SELECT p.*, u.name as owner_name
      FROM projects p JOIN users u ON u.id = p.owner_id
      WHERE p.id = $1
    `, [req.params.id]);
    if (!proj.rows.length) return res.status(404).json({ error: 'Project not found' });

    const access = await pool.query(`
      SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2
      UNION SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2
    `, [req.params.id, req.user.id]);
    if (!access.rows.length) return res.status(403).json({ error: 'Access denied' });

    const members = await pool.query(`
      SELECT u.id, u.name, u.email, u.role as system_role, pm.role as project_role, pm.joined_at
      FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
    `, [req.params.id]);

    res.json({ ...proj.rows[0], members: members.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('description').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const proj = await client.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, req.user.id]
    );
    // Add owner as admin member
    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [proj.rows[0].id, req.user.id, 'admin']
    );
    await client.query('COMMIT');
    res.status(201).json(proj.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  } finally {
    client.release();
  }
});

// Update project (owner or project admin only)
router.put('/:id', [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim()
], async (req, res) => {
  const access = await pool.query(`
    SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2
    UNION SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = 'admin'
  `, [req.params.id, req.user.id]);
  if (!access.rows.length) return res.status(403).json({ error: 'Not authorized' });

  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
      [name, description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project (owner only)
router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) return res.status(403).json({ error: 'Not authorized or not found' });
  res.json({ message: 'Project deleted' });
});

// Add member to project
router.post('/:id/members', [
  body('userId').isInt().withMessage('Valid user ID required'),
  body('role').optional().isIn(['admin', 'member'])
], async (req, res) => {
  const access = await pool.query(`
    SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2
    UNION SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = 'admin'
  `, [req.params.id, req.user.id]);
  if (!access.rows.length) return res.status(403).json({ error: 'Not authorized' });

  const { userId, role = 'member' } = req.body;
  try {
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3',
      [req.params.id, userId, role]
    );
    res.json({ message: 'Member added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member
router.delete('/:id/members/:userId', async (req, res) => {
  const access = await pool.query(`
    SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2
    UNION SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = 'admin'
  `, [req.params.id, req.user.id]);
  if (!access.rows.length) return res.status(403).json({ error: 'Not authorized' });

  await pool.query(
    'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
    [req.params.id, req.params.userId]
  );
  res.json({ message: 'Member removed' });
});

module.exports = router;
