import { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware';

const prisma = new PrismaClient();
const db = prisma as any; // Bypass TS errors until prisma generate runs

// Create a new course
export const createCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { title, slug, description, price } = req.body;
        const instructorId = req.user?.userId;

        if (!title || !slug || !instructorId) {
            res.status(400).json({ error: 'Title and Slug are required' });
            return;
        }

        const newCourse = await prisma.course.create({
            data: {
                title,
                slug,
                description,
                price: price || 0,
                instructorId
            }
        });

        res.status(201).json(newCourse);
    } catch (error) {
        console.error('Create Course Error:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
};

// Get all courses (Public/Filtered) with optional user progress
export const getCourses = async (req: Request, res: Response) => {
    try {
        // Check for authenticated user (optional for public view, but needed for progress)
        const authHeader = req.headers['authorization'];
        let userId: string | null = null;

        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const user: any = verifyToken(token);
                if (user) userId = user.userId;
            }
        }

        const courses = await prisma.course.findMany({
            where: { isPublished: true },
            include: {
                instructor: {
                    select: { username: true, firstName: true, lastName: true }
                },
                modules: {
                    select: { id: true }
                }
            }
        });

        // Calculate progress if user is logged in
        const coursesWithProgress = await Promise.all(courses.map(async (course) => {
            let progress = 0;
            let completedModules = 0;

            if (userId) {
                const userProgress = await prisma.userProgress.findMany({
                    where: {
                        userId,
                        module: { courseId: course.id },
                        completed: true
                    }
                });
                completedModules = userProgress.length;
                const totalModules = course.modules.length;
                progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
            }

            // Remove modules list from final output to keep payload light, 
            // or keep it if frontend needs module count (it does)
            return {
                ...course,
                progress,
                completedModules,
                totalModules: course.modules.length
            };
        }));

        res.json(coursesWithProgress);
    } catch (error) {
        console.error("Get Courses Error", error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};

// Get strictly enrolled courses for the dashboard
export const getMyEnrollments = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        let courses = [];

        if (role === 'ADMIN') {
            // Admins see all published courses
            courses = await prisma.course.findMany({
                where: { isPublished: true },
                include: { instructor: { select: { username: true } }, modules: { select: { id: true } } }
            });
        } else {
            // Find free courses OR courses user is enrolled in
            const enrollments = await db.enrollment.findMany({
                where: { userId, status: 'COMPLETED' },
                select: { courseId: true }
            });
            const enrolledCourseIds = enrollments.map((e: any) => e.courseId);

            courses = await prisma.course.findMany({
                where: {
                    isPublished: true,
                    OR: [
                        { id: { in: enrolledCourseIds } },
                        { price: 0 }
                    ]
                },
                include: { instructor: { select: { username: true } }, modules: { select: { id: true } } }
            });
        }

        // Calculate progress
        const coursesWithProgress = await Promise.all(courses.map(async (course) => {
            let progress = 0;
            const userProgress = await prisma.userProgress.findMany({
                where: { userId, module: { courseId: course.id }, completed: true }
            });
            const completedModules = userProgress.length;
            const totalModules = course.modules.length;
            if (totalModules > 0) progress = Math.round((completedModules / totalModules) * 100);

            return {
                ...course,
                progress,
                completedModules,
                totalModules
            };
        }));

        res.json(coursesWithProgress);
    } catch (error) {
        console.error('My Enrollments Error:', error);
        res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
};

// Update Progress
export const updateProgress = async (req: AuthRequest, res: Response) => {
    try {
        console.log("updateProgress endpoint hit! payload:", req.body, "userId:", req.user?.userId);
        const { moduleId, completed } = req.body;
        const userId = req.user?.userId;

        if (!userId || !moduleId) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const progress = await prisma.userProgress.upsert({
            where: {
                userId_moduleId: {
                    userId,
                    moduleId
                }
            },
            update: {
                completed: completed ?? true,
                completedAt: new Date()
            },
            create: {
                userId,
                moduleId,
                completed: completed ?? true
            }
        });

        console.log("Successfully upserted progress:", progress);

        res.json(progress);
    } catch (error) {
        console.error('Update Progress Error DETAILS:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
};

// Get single course by slug
export const getCourseBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params as { slug: string };

        // Auth check similar to getCourses to attach user progress
        const authHeader = req.headers['authorization'];
        let userId: string | null = null;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const user: any = verifyToken(token);
                if (user) userId = user.userId;
            }
        }

        const course = await prisma.course.findUnique({
            where: { slug },
            include: {
                modules: {
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });

        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }

        // Fetch completed modules if user is logged in
        let completedModuleIds: string[] = [];
        if (userId) {
            try {
                // Type assertion to bypass potential TS errors if client isn't fully updated in IDE context
                const progress = await (prisma as any).userProgress.findMany({
                    where: {
                        userId,
                        module: { courseId: course.id },
                        completed: true
                    },
                    select: { moduleId: true }
                });
                completedModuleIds = progress.map((p: any) => p.moduleId);
            } catch (progressError) {
                console.error("Failed to fetch user progress, continuing without it:", progressError);
                // Continue without crashing the whole request
            }
        }

        res.json({ ...course, completedModuleIds });
    } catch (error) {
        console.error("Get Course Error", error);
        res.status(500).json({ error: 'Failed to fetch course' });
    }
};

// Add Module to Course
export const addModule = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.params as { courseId: string };
        const { title, type, content, videoUrl, orderIndex } = req.body;

        // Verify ownership (or Admin)
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }

        if (course.instructorId !== req.user?.userId && req.user?.role !== UserRole.ADMIN) {
            res.status(403).json({ error: 'Not authorized to modify this course' });
            return;
        }

        const newModule = await prisma.module.create({
            data: {
                courseId,
                title,
                type,
                content,
                videoUrl,
                orderIndex
            }
        });

        res.status(201).json(newModule);
    } catch (error) {
        console.error('Add Module Error:', error);
        res.status(500).json({ error: 'Failed to add module' });
    }
};

// Update Course
export const updateCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { title, description, thumbnailUrl, price } = req.body;

        const course = await prisma.course.findUnique({ where: { id } });
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
        if (course.instructorId !== req.user?.userId && req.user?.role !== UserRole.ADMIN) {
            res.status(403).json({ error: 'Not authorized' }); return;
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
        if (price !== undefined && price !== null) updateData.price = parseFloat(String(price));

        const updated = await prisma.course.update({
            where: { id },
            data: updateData
        });
        res.json(updated);
    } catch (error) {
        console.error('Update Course Error:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
};

// Delete Course
export const deleteCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const course = await prisma.course.findUnique({ where: { id } });
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
        if (course.instructorId !== req.user?.userId && req.user?.role !== UserRole.ADMIN) {
            res.status(403).json({ error: 'Not authorized' }); return;
        }
        await prisma.course.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Course Error:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
};

// Publish/Unpublish Course
export const publishCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const course = await prisma.course.findUnique({ where: { id } });
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
        if (course.instructorId !== req.user?.userId && req.user?.role !== UserRole.ADMIN) {
            res.status(403).json({ error: 'Not authorized' }); return;
        }
        const updated = await prisma.course.update({
            where: { id },
            data: { isPublished: !course.isPublished }
        });
        res.json(updated);
    } catch (error) {
        console.error('Publish Course Error:', error);
        res.status(500).json({ error: 'Failed to toggle publish status' });
    }
};

// Update Module
export const updateModule = async (req: AuthRequest, res: Response) => {
    try {
        const { moduleId } = req.params as { moduleId: string };
        const { title, type, content, videoUrl, orderIndex } = req.body;

        const module = await prisma.module.findUnique({ where: { id: moduleId }, include: { course: true } });
        if (!module) { res.status(404).json({ error: 'Module not found' }); return; }
        if (module.course.instructorId !== req.user?.userId && req.user?.role !== UserRole.ADMIN) {
            res.status(403).json({ error: 'Not authorized' }); return;
        }

        const updated = await prisma.module.update({
            where: { id: moduleId },
            data: { title, type, content, videoUrl, orderIndex }
        });
        res.json(updated);
    } catch (error) {
        console.error('Update Module Error:', error);
        res.status(500).json({ error: 'Failed to update module' });
    }
};

// Delete Module
export const deleteModule = async (req: AuthRequest, res: Response) => {
    try {
        const { moduleId } = req.params as { moduleId: string };
        const module = await prisma.module.findUnique({ where: { id: moduleId }, include: { course: true } });
        if (!module) { res.status(404).json({ error: 'Module not found' }); return; }
        if (module.course.instructorId !== req.user?.userId && req.user?.role !== UserRole.ADMIN) {
            res.status(403).json({ error: 'Not authorized' }); return;
        }
        await prisma.module.delete({ where: { id: moduleId } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Module Error:', error);
        res.status(500).json({ error: 'Failed to delete module' });
    }
};

// Reorder Modules — accepts [{ id, orderIndex }]
export const reorderModules = async (req: AuthRequest, res: Response) => {
    try {
        const updates: { id: string; orderIndex: number }[] = req.body.modules;
        await Promise.all(
            updates.map(({ id, orderIndex }) =>
                prisma.module.update({ where: { id }, data: { orderIndex } })
            )
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Reorder Modules Error:', error);
        res.status(500).json({ error: 'Failed to reorder modules' });
    }
};

// Get ALL courses for admin (including unpublished) — full content
export const getAllCoursesAdmin = async (req: AuthRequest, res: Response) => {
    try {
        const courses = await prisma.course.findMany({
            include: {
                instructor: { select: { username: true } },
                modules: {
                    orderBy: { orderIndex: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(courses);
    } catch (error) {
        console.error('Admin getCourses Error:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};

