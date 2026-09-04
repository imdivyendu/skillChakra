const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['applied', 'review', 'interview', 'selected', 'rejected'], default: 'applied' },
    matchScore: { type: Number, min: 0, max: 100, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

applicationSchema.index({ job: 1, student: 1 }, { unique: true });
module.exports = mongoose.model('Application', applicationSchema);
