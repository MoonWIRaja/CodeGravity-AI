import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, projects, files, templates } from '../db';
import { eq, desc, and, ilike } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const projectRoutes = new Hono();

// ═══════════════════════════════════════════════════════════
// GET /projects - List all user projects
// ═══════════════════════════════════════════════════════════

projectRoutes.get('/', async (c) => {
  const user = c.get('user');
  const search = c.req.query('search');
  const filter = c.req.query('filter'); // 'all', 'favorites', 'recent'

  try {
    let query = db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.updatedAt));

    const allProjects = await query;

    let filteredProjects = allProjects;

    // Apply filters
    if (filter === 'favorites') {
      filteredProjects = allProjects.filter(p => p.isFavorite);
    } else if (filter === 'recent') {
      filteredProjects = allProjects.filter(p => p.lastOpenedAt);
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProjects = filteredProjects.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    return c.json({
      success: true,
      data: filteredProjects,
    });
  } catch (error) {
    console.error('List projects error:', error);
    return c.json({
      success: false,
      error: { code: 'LIST_FAILED', message: 'Failed to list projects' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /projects - Create new project
// ═══════════════════════════════════════════════════════════

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  template: z.string().optional(),
});

projectRoutes.post('/', zValidator('json', createProjectSchema), async (c) => {
  const user = c.get('user');
  const { name, description, template } = c.req.valid('json');

  try {
    // Create project
    const [project] = await db
      .insert(projects)
      .values({
        userId: user.id,
        name,
        description,
        template,
      })
      .returning();

    // If template specified, copy template files
    if (template) {
      const [templateData] = await db
        .select()
        .from(templates)
        .where(eq(templates.name, template))
        .limit(1);

      if (templateData?.files) {
        const fileInserts = templateData.files.map(f => ({
          projectId: project.id,
          path: f.path,
          content: f.content,
          type: f.type as 'file' | 'directory',
          sizeBytes: f.content?.length || 0,
        }));

        if (fileInserts.length > 0) {
          await db.insert(files).values(fileInserts);
        }
      }
    }

    return c.json({
      success: true,
      data: project,
    }, 201);
  } catch (error) {
    console.error('Create project error:', error);
    return c.json({
      success: false,
      error: { code: 'CREATE_FAILED', message: 'Failed to create project' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// GET /projects/:id - Get project details
// ═══════════════════════════════════════════════════════════

projectRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('id');

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
      .limit(1);

    if (!project) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      }, 404);
    }

    // Update last opened timestamp
    await db
      .update(projects)
      .set({ lastOpenedAt: new Date() })
      .where(eq(projects.id, projectId));

    return c.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Get project error:', error);
    return c.json({
      success: false,
      error: { code: 'GET_FAILED', message: 'Failed to get project' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /projects/:id - Update project
// ═══════════════════════════════════════════════════════════

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isFavorite: z.boolean().optional(),
  settings: z.object({
    theme: z.string().optional(),
    fontSize: z.number().optional(),
    tabSize: z.number().optional(),
    autoSave: z.boolean().optional(),
  }).optional(),
});

projectRoutes.put('/:id', zValidator('json', updateProjectSchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('id');
  const updates = c.req.valid('json');

  try {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
      .returning();

    if (!project) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Update project error:', error);
    return c.json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'Failed to update project' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /projects/:id - Delete project
// ═══════════════════════════════════════════════════════════

projectRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('id');

  try {
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
      .returning({ id: projects.id });

    if (result.length === 0) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      }, 404);
    }

    return c.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return c.json({
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Failed to delete project' },
    }, 500);
  }
});
