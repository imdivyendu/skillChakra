const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, maxlength: 4000 },
    location: { type: String, trim: true, maxlength: 120 },
    employmentType: { type: String, enum: ['Internship', 'Full-time', 'Contract'], default: 'Internship' },
    requiredSkills: [{ type: String, trim: true }],
    minimumCgpa: { type: Number, min: 0, max: 10, default: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);
