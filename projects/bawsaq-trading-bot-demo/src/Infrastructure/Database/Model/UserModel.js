const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        telegramId: {
            type: Number,
            required: true,
            unique: true,
            index: true,
        },
        username: {
            type: String,
            default: null,
        },
        firstName: {
            type: String,
            default: null,
        },
        lastName: {
            type: String,
            default: null,
        },
        languageCode: {
            type: String,
            default: null,
        },
        isBot: {
            type: Boolean,
            default: false,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        accessStatus: {
            type: String,
            enum: ['new', 'pending', 'approved', 'rejected'],
            default: 'new',
            index: true,
        },
        applicationText: {
            type: String,
            default: null,
        },
        applicationSubmittedAt: {
            type: Date,
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
        approvedBy: {
            type: Number,
            default: null,
        },
        rejectedAt: {
            type: Date,
            default: null,
        },
        rejectedBy: {
            type: Number,
            default: null,
        },
        lastSeenAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('User', UserSchema);