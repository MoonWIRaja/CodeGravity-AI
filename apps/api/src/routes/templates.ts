import { Hono } from 'hono';
import { db, templates } from '../db';
import { eq, asc } from 'drizzle-orm';

export const templateRoutes = new Hono();

// ═══════════════════════════════════════════════════════════
// GET /templates - List all templates
// ═══════════════════════════════════════════════════════════

templateRoutes.get('/', async (c) => {
  try {
    const allTemplates = await db
      .select({
        id: templates.id,
        name: templates.name,
        description: templates.description,
        icon: templates.icon,
        sortOrder: templates.sortOrder,
      })
      .from(templates)
      .where(eq(templates.isActive, true))
      .orderBy(asc(templates.sortOrder));

    return c.json({
      success: true,
      data: allTemplates,
    });
  } catch (error) {
    console.error('Get templates error:', error);
    return c.json({
      success: false,
      error: { code: 'GET_FAILED', message: 'Failed to get templates' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// GET /templates/:id - Get template details
// ═══════════════════════════════════════════════════════════

templateRoutes.get('/:id', async (c) => {
  const templateId = c.req.param('id');

  try {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (!template) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Get template error:', error);
    return c.json({
      success: false,
      error: { code: 'GET_FAILED', message: 'Failed to get template' },
    }, 500);
  }
});
