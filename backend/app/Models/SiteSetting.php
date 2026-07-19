<?php

namespace App\Models;

use Illuminate\Support\Facades\Mail;
use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    public const DEFAULT_ADDRESS = 'Harabhanga, Gangni, Meherpur, Harabhanga EIDKA (In front Harabhanga EIDKA)';
    public const DEFAULT_MAP_LINK = 'https://maps.app.goo.gl/1Y22XJT1jogNNFbZA';
    public const DEFAULT_MAP_EMBED_URL = 'https://www.google.com/maps?q=Harabhanga%2C%20Gangni%2C%20Meherpur%2C%20Harabhanga%20EIDKA&output=embed';
    public const DEFAULT_HOME_HERO_TITLE = 'Learn with confidence. Succeed with Uttoron.';
    public const DEFAULT_HOME_HERO_SUBTITLE = 'Concept-based coaching, regular evaluation, and supportive guidance for every student.';
    public const DEFAULT_FOOTER_DESCRIPTION = 'Empowering students through quality education, discipline, concept-based learning, and expert mentorship.';
    public const DEFAULT_ABOUT_CONTENT = <<<'MARKDOWN'
# About Uttoron Coaching Centre

## Inspiring Excellence. Building Confidence. Shaping the Future.

Established in **2022**, **Uttoron Coaching Centre** was founded with a clear purpose-to provide students with a learning experience that goes beyond traditional classroom teaching. We believe that true education is built on understanding, curiosity, and continuous growth rather than memorization alone.

Since our journey began, Uttoron Coaching Centre has been dedicated to helping students achieve academic excellence through personalized guidance, concept-based learning, and a supportive educational environment. Every student is encouraged to ask questions, think critically, and develop the confidence needed to succeed both inside and outside the classroom.

---

# Our Mission

At **Uttoron Coaching Centre**, our mission is to empower students with quality education, strong conceptual knowledge, and the confidence to achieve their academic goals. We are committed to creating a learning environment where every student receives individual attention, continuous motivation, and the support needed to unlock their full potential.

---

# Our Vision

Our vision is to become one of the most trusted and respected educational institutions by nurturing knowledgeable, confident, and responsible learners. We aspire to build a generation of students who are academically strong, intellectually curious, and well-prepared for future challenges.

---

# Why Choose Uttoron Coaching Centre?

## Dedicated & Supportive Faculty

Our teachers are more than instructors-they are mentors who genuinely care about every student's progress. They maintain a friendly, approachable, and encouraging classroom atmosphere where students feel comfortable asking questions and expressing their ideas. Every concept is explained with patience and clarity until each learner develops a complete understanding.

---

## Concept-Driven Learning

We focus on building strong academic foundations through conceptual learning instead of rote memorization. By understanding the "why" behind every topic, students develop better analytical thinking, stronger problem-solving abilities, and lasting confidence.

---

## Student-Centered Education

Every learner has unique strengths and learning styles. At **Uttoron Coaching Centre**, we recognize these differences and provide personalized academic guidance to ensure that every student progresses at their own pace while reaching their highest potential.

---

## Consistent Academic Evaluation

Regular class tests, assignments, revision sessions, and performance reviews allow students to measure their progress continuously. This structured evaluation system helps identify areas for improvement and keeps students well-prepared for examinations.

---

## A Positive Learning Culture

Success begins with the right environment. **Uttoron Coaching Centre** promotes a disciplined, respectful, and motivating academic atmosphere where students remain focused, inspired, and eager to learn every day.

---

# Our Teaching Philosophy

At **Uttoron Coaching Centre**, we believe that effective education is interactive, practical, and student-focused.

Our teaching approach combines:

* Concept-based classroom instruction
* Step-by-step explanations for every topic
* Interactive discussions and active participation
* Individual doubt-clearing sessions
* Regular homework and assignments
* Weekly and monthly assessments
* Continuous progress monitoring
* Strategic exam preparation with complete conceptual clarity

Our goal is not simply to help students score higher-it is to help them become confident, independent learners who enjoy the process of learning.

---

# A Learning Environment Designed for Success

A productive educational environment plays a vital role in every student's academic journey.

**Uttoron Coaching Centre** offers a welcoming and well-organized atmosphere where students can learn with confidence, concentration, and enthusiasm. We encourage open communication between teachers and students, creating classrooms where questions are appreciated and learning becomes an engaging experience.

While we currently do not have laboratory facilities, we continuously focus on delivering outstanding classroom instruction, comprehensive academic support, and high-quality teaching that enables students to perform at their very best.

---

# Our Commitment

At **Uttoron Coaching Centre**, education is a responsibility that we proudly embrace.

We are committed to maintaining high academic standards, providing exceptional guidance, and supporting every student's personal and educational growth. Our dedication extends beyond examination success-we strive to develop discipline, confidence, critical thinking, and a lifelong passion for learning.

Every student who joins **Uttoron Coaching Centre** becomes part of a community that values excellence, integrity, perseverance, and continuous improvement.

---

# Join Uttoron Coaching Centre

Choosing the right educational institution is one of the most important decisions in a student's academic journey.

Whether your goal is to strengthen your fundamentals, achieve outstanding examination results, or prepare confidently for future academic challenges, **Uttoron Coaching Centre** is here to guide and support you every step of the way.

**Learn with confidence. Grow with knowledge. Succeed with Uttoron Coaching Centre.**

# Our Academic Excellence

At **Uttoron Coaching Centre**, we believe that consistent evaluation is the key to long-term academic success. To help students stay focused and continuously improve, we conduct **Weekly Examinations** every week and **Monthly Examinations** at the end of each month.

These assessments allow students to monitor their progress regularly, identify their strengths and weaknesses, and develop greater confidence before major school and board examinations. Rather than studying only before exams, students build a habit of continuous learning and consistent preparation throughout the academic year.

---

# Transparent Progress Reporting

We strongly believe that parents play a vital role in a student's educational journey. To maintain complete transparency, examination results and academic performance reports are communicated **directly to parents**.

This ensures that parents remain fully informed about their child's progress and can provide timely encouragement and support whenever needed. Through this transparent communication system, students are motivated to take greater responsibility for their studies while strengthening the partnership between teachers and parents.

---

# Technology-Enhanced Learning

Learning becomes more effective when students can visualize what they study.

At **Uttoron Coaching Centre**, complex and critical topics are explained using **large digital displays** with engaging visual presentations, animations, and interactive illustrations whenever appropriate. Subjects such as **Biology**, where diagrams and processes are essential for understanding, become significantly easier to grasp through animated explanations.

This modern teaching approach improves conceptual understanding, increases classroom engagement, and helps students retain information more effectively.

---

# Why Students Choose Uttoron Coaching Centre

Students and parents trust **Uttoron Coaching Centre** because we combine quality teaching with continuous academic support.

Our strengths include:

* Friendly, supportive, and highly dedicated teachers.
* Concept-based teaching instead of rote memorization.
* Weekly examinations for continuous assessment.
* Monthly examinations to measure overall progress.
* Direct result reporting to parents for complete transparency.
* Personalized guidance and doubt-clearing support.
* Smart classroom teaching with animated visual presentations.
* A disciplined, positive, and student-friendly learning environment.
* Continuous performance monitoring throughout the academic year.
* Strong preparation for school examinations and future academic success.
MARKDOWN;

    protected $fillable = [
        'site_name',
        'home_hero_title',
        'home_hero_subtitle',
        'footer_description',
        'address',
        'map_link',
        'map_embed_url',
        'phone',
        'email',
        'facebook_url',
        'youtube_url',
        'twitter_url',
        'instagram_url',
        'about_content',
        'student_count',
        'years_experience',
        'success_rate',
        'admission_email',
        'messages_email',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'smtp_from_address',
        'smtp_from_name',
        'smtp_encryption',
    ];

    protected $hidden = [
        'smtp_password',
    ];

    /**
     * Always return the singleton settings row (creates it if missing).
     */
    public static function instance(): self
    {
        return self::firstOrCreate(
            ['id' => 1],
            [
                'site_name' => 'Uttoron Coaching Center',
                'home_hero_title' => self::DEFAULT_HOME_HERO_TITLE,
                'home_hero_subtitle' => self::DEFAULT_HOME_HERO_SUBTITLE,
                'footer_description' => self::DEFAULT_FOOTER_DESCRIPTION,
                'address' => self::DEFAULT_ADDRESS,
                'map_link' => self::DEFAULT_MAP_LINK,
                'map_embed_url' => self::DEFAULT_MAP_EMBED_URL,
                'about_content' => self::DEFAULT_ABOUT_CONTENT,
            ]
        );
    }

    /**
     * Apply the stored SMTP configuration to the Laravel mailer at runtime.
     * Call this before Mail::send() so emails use the admin-configured account.
     */
    public static function applySmtpConfig(): void
    {
        $settings = self::instance();

        if (!filled($settings->smtp_host)) {
            return; // fall back to .env defaults
        }

        $username = self::firstValidEmail([
            $settings->smtp_username,
            $settings->smtp_from_address,
            $settings->admission_email,
            $settings->messages_email,
            $settings->email,
            env('MAIL_USERNAME'),
            env('MAIL_FROM_ADDRESS'),
        ]);

        $password = self::normalizeAppPassword($settings->smtp_password ?: env('MAIL_PASSWORD'));

        if (!filled($username) || !filled($password)) {
            return; // fall back to .env defaults if the admin has not completed SMTP setup
        }

        $encryption = $settings->smtp_encryption ?: 'tls';
        $scheme = ($encryption === 'ssl' || (string) $settings->smtp_port === '465') ? 'smtps' : null;
        $fromAddress = self::firstValidEmail([
            $settings->smtp_from_address,
            $username,
            env('MAIL_FROM_ADDRESS'),
        ]);

        config()->set('mail.default', 'smtp');
        config()->set('mail.mailers.smtp', [
            'transport'  => 'smtp',
            'scheme'     => $scheme,
            'host'       => $settings->smtp_host ?: 'smtp.gmail.com',
            'port'       => $settings->smtp_port ?: '587',
            'auto_tls'   => $encryption !== 'none',
            'username'   => $username,
            'password'   => $password,
            'timeout'    => null,
            'local_domain' => parse_url((string) config('app.url'), PHP_URL_HOST),
        ]);

        if (filled($fromAddress)) {
            config()->set('mail.from', [
                'address' => $fromAddress,
                'name'    => $settings->smtp_from_name ?: 'Uttoron Coaching Center',
            ]);
        }

        Mail::forgetMailers();
    }

    public static function normalizeAppPassword(?string $password): ?string
    {
        if ($password === null) {
            return null;
        }

        return preg_replace('/\s+/', '', trim($password));
    }

    private static function firstValidEmail(array $values): ?string
    {
        foreach ($values as $value) {
            $email = trim((string) $value);

            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $email;
            }
        }

        return null;
    }

    /**
     * Public-safe fields only (never expose SMTP / receiver emails).
     */
    public function toPublicArray(): array
    {
        return [
            'site_name'         => $this->site_name,
            'home_hero_title'   => $this->home_hero_title ?: self::DEFAULT_HOME_HERO_TITLE,
            'home_hero_subtitle'=> $this->home_hero_subtitle ?: self::DEFAULT_HOME_HERO_SUBTITLE,
            'footer_description'=> $this->footer_description ?: self::DEFAULT_FOOTER_DESCRIPTION,
            'address'           => $this->address ?: self::DEFAULT_ADDRESS,
            'map_link'          => $this->map_link ?: self::DEFAULT_MAP_LINK,
            'map_embed_url'     => $this->map_embed_url ?: self::DEFAULT_MAP_EMBED_URL,
            'phone'             => $this->phone,
            'email'             => $this->email,
            'facebook_url'      => $this->facebook_url,
            'youtube_url'       => $this->youtube_url,
            'twitter_url'       => $this->twitter_url,
            'instagram_url'     => $this->instagram_url,
            'about_content'     => $this->about_content ?: self::DEFAULT_ABOUT_CONTENT,
            'student_count'     => $this->student_count,
            'years_experience'  => $this->years_experience,
            'success_rate'      => $this->success_rate,
        ];
    }
}
