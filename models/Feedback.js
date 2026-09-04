const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    decision: { type: String, enum: ['selected', 'rejected'], required: true },
    reason: { type: String, required: true, trim: true, maxlength: 240 },
    feedback: { type: String, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
