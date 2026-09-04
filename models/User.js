const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'college', 'company'], required: true },
    profile: {
        skills: [{ name: String, score: { type: Number, min: 0, max: 100, default: 0 } }],
        education: { type: String, trim: true },
        college: { type: String, trim: true },
        cgpa: { type: Number, min: 0, max: 10 },
        bio: { type: String, maxlength: 1000 },
        companyDescription: { type: String, maxlength: 1000 }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
