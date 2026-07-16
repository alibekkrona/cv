const mongoose = require('mongoose');

const SignalSchema = new mongoose.Schema(
    {
        symbol: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        side: {
            type: String,
            required: true,
            enum: ['buy', 'sell'],
        },
        entryZone: {
            type: String,
            required: true,
            trim: true,
        },
        stopLoss: {
            type: String,
            required: true,
            trim: true,
        },
        takeProfit: {
            type: String,
            required: true,
            trim: true,
        },
        comment: {
            type: String,
            default: '',
            trim: true,
        },
        status: {
            type: String,
            enum: ['draft', 'active', 'closed', 'canceled'],
            default: 'draft',
            index: true,
        },
        createdBy: {
            type: Number,
            required: true,
            index: true,
        },
        publishedAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('Signal', SignalSchema);
