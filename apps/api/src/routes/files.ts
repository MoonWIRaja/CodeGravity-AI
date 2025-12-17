import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, files, fileVersions, projects } from '../db';
import { eq, and, like } from 'drizzle-orm';

export const fileRoutes = new Hono();

// Helper: Check project ownership
async function checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  return !!project;
}

// ═══════════════════════════════════════════════════════════
// GET /files/:projectId - Get file tree
// ═══════════════════════════════════════════════════════════

fileRoutes.get('/:projectId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  if (!await checkProjectAccess(projectId, user.id)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied' },
    }, 403);
  }

  try {
    const allFiles = await db
      .select({
        id: files.id,
        path: files.path,
        type: files.type,
        sizeBytes: files.sizeBytes,
        updatedAt: files.updatedAt,
      })
      .from(files)
      .where(eq(files.projectId, projectId));

    // Build tree structure
    const tree = buildFileTree(allFiles);

    return c.json({
      success: true,
      data: { files: allFiles, tree },
    });
  } catch (error) {
    console.error('Get files error:', error);
    return c.json({
      success: false,
      error: { code: 'GET_FAILED', message: 'Failed to get files' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// GET /files/:projectId/content/* - Get file content
// ═══════════════════════════════════════════════════════════

fileRoutes.get('/:projectId/content/*', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const filePath = c.req.path.split('/content/')[1];

  if (!await checkProjectAccess(projectId, user.id)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied' },
    }, 403);
  }

  try {
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.projectId, projectId), eq(files.path, filePath)))
      .limit(1);

    if (!file) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'File not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: file,
    });
  } catch (error) {
    console.error('Get file content error:', error);
    return c.json({
      success: false,
      error: { code: 'GET_FAILED', message: 'Failed to get file' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /files/:projectId/content/* - Update/create file
// ═══════════════════════════════════════════════════════════

const updateFileSchema = z.object({
  content: z.string(),
});

fileRoutes.put('/:projectId/content/*', zValidator('json', updateFileSchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const filePath = c.req.path.split('/content/')[1];
  const { content } = c.req.valid('json');

  if (!await checkProjectAccess(projectId, user.id)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied' },
    }, 403);
  }

  try {
    // Check if file exists
    const [existingFile] = await db
      .select()
      .from(files)
      .where(and(eq(files.projectId, projectId), eq(files.path, filePath)))
      .limit(1);

    if (existingFile) {
      // Create version backup
      const [latestVersion] = await db
        .select({ version: fileVersions.version })
        .from(fileVersions)
        .where(eq(fileVersions.fileId, existingFile.id))
        .orderBy(fileVersions.version)
        .limit(1);

      const newVersion = (latestVersion?.version || 0) + 1;

      await db.insert(fileVersions).values({
        fileId: existingFile.id,
        content: existingFile.content || '',
        version: newVersion,
      });

      // Update file
      const [updated] = await db
        .update(files)
        .set({
          content,
          sizeBytes: content.length,
          updatedAt: new Date(),
        })
        .where(eq(files.id, existingFile.id))
        .returning();

      return c.json({
        success: true,
        data: updated,
      });
    } else {
      // Create new file
      const [newFile] = await db
        .insert(files)
        .values({
          projectId,
          path: filePath,
          content,
          type: 'file',
          sizeBytes: content.length,
        })
        .returning();

      return c.json({
        success: true,
        data: newFile,
      }, 201);
    }
  } catch (error) {
    console.error('Update file error:', error);
    return c.json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'Failed to update file' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /files/:projectId/content/* - Delete file
// ═══════════════════════════════════════════════════════════

fileRoutes.delete('/:projectId/content/*', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const filePath = c.req.path.split('/content/')[1];

  if (!await checkProjectAccess(projectId, user.id)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied' },
    }, 403);
  }

  try {
    const result = await db
      .delete(files)
      .where(and(eq(files.projectId, projectId), eq(files.path, filePath)))
      .returning({ id: files.id });

    if (result.length === 0) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'File not found' },
      }, 404);
    }

    return c.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return c.json({
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Failed to delete file' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /files/:projectId/bulk - Bulk file operations
// ═══════════════════════════════════════════════════════════

const bulkOperationSchema = z.object({
  operations: z.array(z.object({
    type: z.enum(['create', 'update', 'delete']),
    path: z.string(),
    content: z.string().optional(),
    fileType: z.enum(['file', 'directory']).optional(),
  })),
});

fileRoutes.post('/:projectId/bulk', zValidator('json', bulkOperationSchema), async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const { operations } = c.req.valid('json');

  if (!await checkProjectAccess(projectId, user.id)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied' },
    }, 403);
  }

  try {
    const results = [];

    for (const op of operations) {
      switch (op.type) {
        case 'create':
        case 'update':
          const [file] = await db
            .insert(files)
            .values({
              projectId,
              path: op.path,
              content: op.content || '',
              type: op.fileType || 'file',
              sizeBytes: op.content?.length || 0,
            })
            .onConflictDoUpdate({
              target: [files.projectId, files.path],
              set: {
                content: op.content || '',
                sizeBytes: op.content?.length || 0,
                updatedAt: new Date(),
              },
            })
            .returning();
          results.push({ path: op.path, status: 'success', id: file.id });
          break;
        case 'delete':
          await db
            .delete(files)
            .where(and(eq(files.projectId, projectId), eq(files.path, op.path)));
          results.push({ path: op.path, status: 'deleted' });
          break;
      }
    }

    return c.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    return c.json({
      success: false,
      error: { code: 'BULK_FAILED', message: 'Bulk operation failed' },
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// Helper: Build file tree from flat list
// ═══════════════════════════════════════════════════════════

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

function buildFileTree(fileList: { path: string; type: string | null }[]): FileNode[] {
  const root: FileNode[] = [];
  const pathMap = new Map<string, FileNode>();

  // Sort by path depth
  const sorted = fileList.sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sorted) {
    const parts = file.path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!pathMap.has(currentPath)) {
        const node: FileNode = {
          name: part,
          path: currentPath,
          type: isLast ? (file.type as 'file' | 'directory') : 'directory',
          children: isLast && file.type === 'file' ? undefined : [],
        };

        pathMap.set(currentPath, node);

        if (i === 0) {
          root.push(node);
        } else {
          const parentPath = parts.slice(0, i).join('/');
          const parent = pathMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(node);
          }
        }
      }
    }
  }

  return root;
}
