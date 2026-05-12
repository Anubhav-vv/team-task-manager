const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const hasProjectAccess = async (projectId, userId) => {
  const res = await pool.query(`
    SELECT pm.role FROM project_members pm WHERE pm.project_id = $1 AND pm.user_id = $2
    UNION SELECT 'owner' FROM projects WHERE id = $1 AND owner_id = $2
  `, [projectId, userId]);
  return res.rows[0]?.role || null;
};

// Get tasks for a project (with optional filters)
router.get('/', async (req, res) => {
  const { projectId, status, assigneeId, priority } = req.query;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  const role = await hasProjectAccess(projectId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Access denied' });

  let query = `
    SELECT t.*,
      a.name as assignee_name, a.email as assignee_email,
      c.name as created_by_name
    FROM tasks t
    LEFT JOIN users a ON a.id = t.assignee_id
    LEFT JOIN users c ON c.id = t.created_by
    WHERE t.project_id = $1
  `;
  const params = [projectId];
  let idx = 2;

  if (status) { query += ` AND t.status = $${idx++}`; params.push(status); }
  if (assigneeId) { query += ` AND t.assignee_id = $${idx++}`; params.push(assigneeId); }
  if (priority) { query += ` AND t.priority = $${idx++}`; params.push(priority); }

  query += ' ORDER BY t.created_at DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get dashboard summary for current user
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE t.status = 'todo') as todo,
        COUNT(*) FILTER (WHERE t.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE t.status = 'done') as done,
        COUNT(*) FILTER (WHERE t.due_date < NOW() AND t.status != 'done') as overdue,
        COUNT(*) as total
      FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
    `, [req.user.id]);

    const recent = await pool.query(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assignee_id
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
      WHERE t.status != 'done'
      ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
      LIMIT 8
    `, [req.user.id]);

    res.json({ stats: stats.rows[0], recent: recent.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Create task
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('projectId').isInt().withMessage('Valid project ID required'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('assigneeId').optional().isInt(),
  body('dueDate').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, projectId, status = 'todo', priority = 'medium', assigneeId, dueDate } = req.body;

  const role = await hasProjectAccess(projectId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Access denied' });

  try {
    const result = await pool.query(`
      INSERT INTO tasks (title, description, project_id, status, priority, assignee_id, due_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title, description || null, projectId, status, priority, assigneeId || null, dueDate || null, req.user.id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', [
  body('title').optional().trim().notEmpty(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high'])
], async (req, res) => {
  const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (!task.rows.length) return res.status(404).json({ error: 'Task not found' });

  const role = await hasProjectAccess(task.rows[0].project_id, req.user.id);
  if (!role) return res.status(403).json({ error: 'Access denied' });

  const { title, description, status, priority, assigneeId, dueDate } = req.body;
  try {
    const result = await pool.query(`
      UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        assignee_id = COALESCE($5, assignee_id),
        due_date = COALESCE($6, due_date),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [title, description, status, priority, assigneeId, dueDate, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (!task.rows.length) return res.status(404).json({ error: 'Task not found' });

  const role = await hasProjectAccess(task.rows[0].project_id, req.user.id);
  if (!role || (role === 'member' && task.rows[0].created_by !== req.user.id)) {
    return res.status(403).json({ error: 'Not authorized to delete this task' });
  }

  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
