const express = require('express');
const User = require('../models/User');

const router = express.Router();
const requireAuth = (req, res, next) => req.isAuthenticated() ? next() : res.status(401).json({ error: 'Please sign in first.' });
const requireRole = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'This action is not available for your role.' });

router.get('/me', requireAuth, (req, res) => res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, profile: req.user.profile } }));
router.patch('/profile', requireAuth, async (req, res, next) => {
    try {
        const allowed = ['skills', 'education', 'college', 'cgpa', 'bio', 'companyDescription'];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
        const user = await User.findByIdAndUpdate(req.user.id, { $set: Object.fromEntries(Object.entries(updates).map(([key, value]) => [`profile.${key}`, value])) }, { new: true, runValidators: true });
        res.json({ user });
    } catch (error) { next(error); }
});

router.get('/students', requireAuth, requireRole('college', 'company'), async (req, res, next) => {
    try {
        const query = { role: 'student' };
        if (req.user.role === 'college') query['profile.college'] = req.user.name;
        const students = await User.find(query).select('name email profile role');
        res.json({ students });
    } catch (error) { next(error); }
});

router.post('/feedback', requireAuth, requireRole('company'), async (req, res) => {
    const { studentId, status, reason, feedback } = req.body;
    if (!studentId || !['selected', 'rejected'].includes(status) || !reason) return res.status(400).json({ error: 'Student, decision, and reason are required.' });
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.status(201).json({ message: 'Feedback recorded.', decision: { studentId, status, reason, feedback: feedback || '' } });
});

router.post('/verify-student', requireAuth, requireRole('college'), async (req, res, next) => {
    try {
        const { studentId, score } = req.body;
        const student = await User.findOneAndUpdate({ _id: studentId, role: 'student', 'profile.college': req.user.name }, { $set: { 'profile.collegeScore': Math.max(0, Math.min(100, Number(score))) } }, { new: true });
        if (!student) return res.status(404).json({ error: 'Student was not found in your college.' });
        res.json({ message: 'Student verification score updated.', student });
    } catch (error) { next(error); }
});

module.exports = router;
