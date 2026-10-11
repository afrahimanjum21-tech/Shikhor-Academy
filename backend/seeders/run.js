import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';
import models from '../models/index.js';

async function runSeeders() {
  try {
    console.log('Running seeders...');

    const seederPass = process.env.SEEDER_PASSWORD;
    if (!seederPass) {
      throw new Error('SEEDER_PASSWORD environment variable is required to run seeders. Set it before running npm run seed.');
    }
    const password = await bcrypt.hash(seederPass, 12);

    const adminEmail = process.env.SEEDER_ADMIN_EMAIL || 'afrahimamjum00@gmail.com';
    const admin = await models.User.findOrCreate({
      where: { email: adminEmail },
      defaults: {
        name: 'Super Admin',
        email: adminEmail,
        password,
        role: 'super_admin',
        phone: '01700000000',
        is_active: true,
      },
    });

    const departments = await models.Department.bulkCreate([
      { name: 'Science', slug: 'science', display_order: 1 },
      { name: 'Arts', slug: 'arts', display_order: 2 },
      { name: 'Commerce', slug: 'commerce', display_order: 3 },
    ], { ignoreDuplicates: true });

    const categories = await models.FacultyCategory.bulkCreate([
      { name: 'Permanent Faculty', slug: 'permanent-faculty', display_order: 1 },
      { name: 'Visiting Faculty', slug: 'visiting-faculty', display_order: 2 },
      { name: 'Guest Lecturer', slug: 'guest-lecturer', display_order: 3 },
    ], { ignoreDuplicates: true });

    const subjects = await models.Subject.bulkCreate([
      { name: 'Bangla', slug: 'bangla', display_order: 1 },
      { name: 'English', slug: 'english', display_order: 2 },
      { name: 'Mathematics', slug: 'mathematics', display_order: 3 },
      { name: 'Physics', slug: 'physics', display_order: 4 },
      { name: 'Chemistry', slug: 'chemistry', display_order: 5 },
      { name: 'Biology', slug: 'biology', display_order: 6 },
      { name: 'ICT', slug: 'ict', display_order: 7 },
    ], { ignoreDuplicates: true });

    await models.CourseCategory.bulkCreate([
      { name: 'Science Group', slug: 'science-group', icon: '🔬', color: '#3B82F6', display_order: 1 },
      { name: 'Arts Group', slug: 'arts-group', icon: '🎨', color: '#EC4899', display_order: 2 },
      { name: 'Commerce Group', slug: 'commerce-group', icon: '💰', color: '#10B981', display_order: 3 },
      { name: 'Language', slug: 'language', icon: '📝', color: '#F59E0B', display_order: 4 },
    ], { ignoreDuplicates: true });

    // §H/F: resolve category ids by their stable SLUG, never a hardcoded
    // auto-increment id — on a non-pristine DB (categories already present with
    // other ids, or some skipped as duplicates) `category_id: 1/4` would point
    // at the wrong category or a non-existent row.
    const courseCategoryRows = await models.CourseCategory.findAll({ attributes: ['id', 'slug'] });
    const categoryIdBySlug = Object.fromEntries(courseCategoryRows.map((c) => [c.slug, c.id]));

    const course1 = await models.Course.findOrCreate({
      where: { slug: 'hsc-science-batch' },
      defaults: {
        title: 'HSC Science Batch',
        slug: 'hsc-science-batch',
        description: 'Complete HSC Science program with experienced faculty',
        category_id: categoryIdBySlug['science-group'] || null,
        fee: 15000,
        duration: '6 months',
        teacher_name: 'Prof. Rahman',
        class_mode: 'offline',
        is_featured: true,
        is_active: true,
      },
    });

    const course2 = await models.Course.findOrCreate({
      where: { slug: 'english-foundation' },
      defaults: {
        title: 'English Foundation Course',
        slug: 'english-foundation',
        description: 'Build strong English language skills',
        category_id: categoryIdBySlug['language'] || null,
        fee: 8000,
        discount_price: 6500,
        duration: '3 months',
        teacher_name: 'Ms. Fatima',
        class_mode: 'hybrid',
        is_featured: true,
        is_active: true,
      },
    });

    await models.SiteSetting.findOrCreate({
      where: { id: 1 },
      defaults: {
        site_name: 'Uttoron Coaching Centre',
        student_count: 500,
        years_experience: 10,
        success_rate: 95,
        established_year: 2022,
        address: '123, Main Road, Dhaka, Bangladesh',
        phone: '+8801700000000',
        email: 'info@uttoron.com',
        facebook_url: 'https://facebook.com/uttoron',
        youtube_url: 'https://youtube.com/@uttoron',
      },
    });

    console.log('Seeders completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeder failed:', error);
    process.exit(1);
  }
}

runSeeders();
