const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Feedback = require('../models/Feedback');

const router = express.Router();
const roles = { student: 'Student', college: 'College admin', company: 'Company' };
const requireDatabase = (req, res, next) => req.app.locals.databaseReady ? next() : res.redirect('/login?message=' + encodeURIComponent('Database is unavailable. Check your MongoDB Atlas IP access and connection string.'));
const requirePageAuth = (req, res, next) => req.isAuthenticated() ? next() : res.redirect('/login?message=Please sign in to continue.');
const requirePageRole = (...allowed) => (req, res, next) => allowed.includes(req.user.role) ? next() : res.status(403).render('pages/error', { title: 'Access denied', message: 'This workspace is not available for your account.' });
const page = (view, data = {}) => (req, res) => res.render(view, { user: req.user, roleLabel: roles[req.user?.role], notice: req.query.message, ...data });

router.get('/', (req, res) => req.user ? res.redirect(`/${req.user.role}/dashboard`) : res.redirect('/login'));
router.get('/login', (req, res) => req.user ? res.redirect(`/${req.user.role}/dashboard`) : res.render('auth/login', { title: 'Sign in', message: req.query.message }));
router.get('/signup', (req, res) => req.user ? res.redirect(`/${req.user.role}/dashboard`) : res.render('auth/signup', { title: 'Create account', selectedRole: req.query.role || 'student', message: req.query.message }));
router.post('/logout', (req, res, next) => req.logout((error) => error ? next(error) : req.session.destroy(() => res.redirect('/login?message=You have been signed out.'))));
router.post('/login', requireDatabase, (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
        if (error) return next(error);
        if (!user) return res.redirect(`/login?message=${encodeURIComponent(info?.message || 'Invalid email or password.')}`);
        if (req.body.role !== user.role) return res.redirect(`/login?message=${encodeURIComponent(`This account is registered as a ${user.role}.`)}`);
        req.logIn(user, (loginError) => loginError ? next(loginError) : res.redirect(`/${user.role}/dashboard`));
    })(req, res, next);
});
router.post('/signup', requireDatabase, async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !['student', 'college', 'company'].includes(role)) return res.redirect(`/signup?role=${role || 'student'}&message=${encodeURIComponent('Complete every field and choose a valid account type.')}`);
        if (password.length < 8) return res.redirect(`/signup?role=${role}&message=${encodeURIComponent('Password must be at least 8 characters.')}`);
        const normalizedEmail = email.toLowerCase().trim();
        if (await User.exists({ email: normalizedEmail })) return res.redirect(`/login?message=${encodeURIComponent('An account with this email already exists.')}`);
        const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), role });
        req.logIn(user, (error) => error ? next(error) : res.redirect(`/${role}/dashboard`));
    } catch (error) { next(error); }
});

router.get('/student/dashboard', requirePageAuth, requirePageRole('student'), async (req, res, next) => {
    try {
        const [applications, jobs] = await Promise.all([Application.find({ student: req.user.id }).populate('job').sort('-createdAt').limit(5), Job.find({ status: 'open' }).sort('-createdAt').limit(6)]);
        res.render('student/dashboard', { user: req.user, roleLabel: roles.student, applications, jobs, notice: req.query.message });
    } catch (error) { next(error); }
});
router.get('/student/profile', requirePageAuth, requirePageRole('student'), page('student/profile'));
router.post('/student/profile', requirePageAuth, requirePageRole('student'), async (req, res, next) => {
    try { await User.findByIdAndUpdate(req.user.id, { $set: { 'profile.education': req.body.education, 'profile.college': req.body.college, 'profile.cgpa': req.body.cgpa, 'profile.bio': req.body.bio, 'profile.skills': parseSkills(req.body.skills) } }); res.redirect('/student/profile?message=Profile updated.'); } catch (error) { next(error); }
});
router.get('/student/opportunities', requirePageAuth, requirePageRole('student'), async (req, res, next) => {
    try { const jobs = await Job.find({ status: 'open' }).populate('company', 'name profile.companyDescription').sort('-createdAt'); const applied = await Application.find({ student: req.user.id }).select('job'); res.render('student/opportunities', { user: req.user, roleLabel: roles.student, jobs, applied: new Set(applied.map((item) => String(item.job))), notice: req.query.message }); } catch (error) { next(error); }
});
router.post('/student/opportunities/:jobId/apply', requirePageAuth, requirePageRole('student'), async (req, res, next) => {
    try { const job = await Job.findOne({ _id: req.params.jobId, status: 'open' }); if (!job) return res.redirect('/student/opportunities?message=That opportunity is no longer open.'); const skills = new Set((req.user.profile?.skills || []).map((skill) => skill.name.toLowerCase())); const matchScore = Math.round((job.requiredSkills.filter((skill) => skills.has(skill.toLowerCase())).length / Math.max(job.requiredSkills.length, 1)) * 100); await Application.create({ job: job.id, student: req.user.id, matchScore }); res.redirect('/student/opportunities?message=Application submitted.'); } catch (error) { if (error.code === 11000) return res.redirect('/student/opportunities?message=You already applied for this role.'); next(error); }
});
router.get('/student/feedback', requirePageAuth, requirePageRole('student'), async (req, res, next) => { try { const feedback = await Feedback.find({ student: req.user.id }).populate({ path: 'application', populate: { path: 'job', select: 'title' } }).populate('company', 'name').sort('-createdAt'); res.render('student/feedback', { user: req.user, roleLabel: roles.student, feedback }); } catch (error) { next(error); } });

router.get('/company/dashboard', requirePageAuth, requirePageRole('company'), async (req, res, next) => { try { const [jobs, applications] = await Promise.all([Job.find({ company: req.user.id }).sort('-createdAt'), Application.find({ job: { $in: await Job.find({ company: req.user.id }).distinct('_id') } }).populate('student job').sort('-createdAt').limit(8)]); res.render('company/dashboard', { user: req.user, roleLabel: roles.company, jobs, applications, notice: req.query.message }); } catch (error) { next(error); } });
router.get('/company/jobs/new', requirePageAuth, requirePageRole('company'), page('company/new-job'));
router.post('/company/jobs', requirePageAuth, requirePageRole('company'), async (req, res, next) => { try { await Job.create({ company: req.user.id, title: req.body.title, description: req.body.description, location: req.body.location, employmentType: req.body.employmentType, requiredSkills: parseList(req.body.requiredSkills), minimumCgpa: req.body.minimumCgpa || 0 }); res.redirect('/company/dashboard?message=Opportunity published.'); } catch (error) { next(error); } });
router.get('/company/candidates', requirePageAuth, requirePageRole('company'), async (req, res, next) => { try { const jobs = await Job.find({ company: req.user.id }).select('_id'); const applications = await Application.find({ job: { $in: jobs.map((job) => job.id) } }).populate('student job').sort('-matchScore'); res.render('company/candidates', { user: req.user, roleLabel: roles.company, applications, notice: req.query.message }); } catch (error) { next(error); } });
router.post('/company/applications/:applicationId/decision', requirePageAuth, requirePageRole('company'), async (req, res, next) => { try { const application = await Application.findById(req.params.applicationId).populate('job'); if (!application || String(application.job.company) !== req.user.id) return res.redirect('/company/candidates?message=Application not found.'); application.status = req.body.decision === 'selected' ? 'selected' : 'rejected'; await application.save(); await Feedback.create({ application: application.id, company: req.user.id, student: application.student, decision: application.status, reason: req.body.reason, feedback: req.body.feedback }); res.redirect('/company/candidates?message=Decision and feedback sent.'); } catch (error) { next(error); } });

router.get('/college/dashboard', requirePageAuth, requirePageRole('college'), async (req, res, next) => { try { const students = await User.find({ role: 'student', 'profile.college': req.user.name }).sort('name'); res.render('college/dashboard', { user: req.user, roleLabel: roles.college, students, notice: req.query.message }); } catch (error) { next(error); } });
router.get('/college/students', requirePageAuth, requirePageRole('college'), async (req, res, next) => { try { const students = await User.find({ role: 'student', 'profile.college': req.user.name }).sort('name'); res.render('college/students', { user: req.user, roleLabel: roles.college, students, notice: req.query.message }); } catch (error) { next(error); } });
router.post('/college/students/:studentId/verify', requirePageAuth, requirePageRole('college'), async (req, res, next) => { try { const score = Math.max(0, Math.min(100, Number(req.body.score))); await User.findOneAndUpdate({ _id: req.params.studentId, role: 'student', 'profile.college': req.user.name }, { $set: { 'profile.collegeScore': score } }); res.redirect('/college/students?message=Trust score updated.'); } catch (error) { next(error); } });

function parseList(value) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean); }
function parseSkills(value) { return parseList(value).map((name) => ({ name, score: 0 })); }
module.exports = router;
