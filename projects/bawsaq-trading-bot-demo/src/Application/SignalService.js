const Joi = require('joi');

const SignalModel = require('../Infrastructure/Database/Model/SignalModel');

class SignalService {
    static getCreateSchema() {
        return Joi.object({
            symbol: Joi.string().trim().max(32).required(),
            side: Joi.string().valid('buy', 'sell').required(),
            entryZone: Joi.string().trim().max(120).required(),
            stopLoss: Joi.string().trim().max(120).required(),
            takeProfit: Joi.string().trim().max(120).required(),
            comment: Joi.string().allow('').max(1000).default(''),
        });
    }

    static getUpdateSchema() {
        return Joi.object({
            symbol: Joi.string().trim().max(32),
            side: Joi.string().valid('buy', 'sell'),
            entryZone: Joi.string().trim().max(120),
            stopLoss: Joi.string().trim().max(120),
            takeProfit: Joi.string().trim().max(120),
            comment: Joi.string().allow('').max(1000),
        }).min(1);
    }

    static mapSignal(signal) {
        return {
            id: String(signal._id),
            symbol: signal.symbol,
            side: signal.side,
            entryZone: signal.entryZone,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            comment: signal.comment || '',
            status: signal.status,
            createdBy: signal.createdBy,
            publishedAt: signal.publishedAt || null,
            createdAt: signal.createdAt || null,
            updatedAt: signal.updatedAt || null,
        };
    }

    static async createSignal(payload, createdBy) {
        const { value, error } = SignalService.getCreateSchema().validate(payload, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            return {
                ok: false,
                code: 'VALIDATION_ERROR',
                error: error.message,
            };
        }

        const signal = await SignalModel.create({
            ...value,
            symbol: String(value.symbol).toUpperCase(),
            createdBy: Number(createdBy),
            status: 'draft',
            publishedAt: null,
        });

        return {
            ok: true,
            code: 'CREATED',
            signal: SignalService.mapSignal(signal),
        };
    }

    static async updateDraftSignal(signalId, payload) {
        const signal = await SignalModel.findById(signalId);

        if (!signal) {
            return { ok: false, code: 'NOT_FOUND' };
        }

        if (signal.status !== 'draft') {
            return { ok: false, code: 'DRAFT_ONLY', signal: SignalService.mapSignal(signal) };
        }

        const { value, error } = SignalService.getUpdateSchema().validate(payload, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            return {
                ok: false,
                code: 'VALIDATION_ERROR',
                error: error.message,
            };
        }

        if (value.symbol) {
            value.symbol = String(value.symbol).toUpperCase();
        }

        const updated = await SignalModel.findByIdAndUpdate(
            signalId,
            { $set: value },
            { new: true }
        );

        return {
            ok: true,
            code: 'UPDATED',
            signal: SignalService.mapSignal(updated),
        };
    }

    static async publishSignal(signalId) {
        const signal = await SignalModel.findById(signalId);

        if (!signal) {
            return { ok: false, code: 'NOT_FOUND' };
        }

        if (signal.status !== 'draft') {
            return { ok: false, code: 'INVALID_STATUS', signal: SignalService.mapSignal(signal) };
        }

        const updated = await SignalModel.findByIdAndUpdate(
            signalId,
            {
                $set: {
                    status: 'active',
                    publishedAt: signal.publishedAt || new Date(),
                },
            },
            { new: true }
        );

        return {
            ok: true,
            code: 'PUBLISHED',
            signal: SignalService.mapSignal(updated),
        };
    }

    static async closeSignal(signalId) {
        const signal = await SignalModel.findById(signalId);

        if (!signal) {
            return { ok: false, code: 'NOT_FOUND' };
        }

        if (signal.status !== 'active') {
            return { ok: false, code: 'ACTIVE_ONLY', signal: SignalService.mapSignal(signal) };
        }

        const updated = await SignalModel.findByIdAndUpdate(
            signalId,
            { $set: { status: 'closed' } },
            { new: true }
        );

        return {
            ok: true,
            code: 'CLOSED',
            signal: SignalService.mapSignal(updated),
        };
    }

    static async cancelSignal(signalId) {
        const signal = await SignalModel.findById(signalId);

        if (!signal) {
            return { ok: false, code: 'NOT_FOUND' };
        }

        if (!['draft', 'active'].includes(signal.status)) {
            return { ok: false, code: 'CANNOT_CANCEL', signal: SignalService.mapSignal(signal) };
        }

        const updated = await SignalModel.findByIdAndUpdate(
            signalId,
            { $set: { status: 'canceled' } },
            { new: true }
        );

        return {
            ok: true,
            code: 'CANCELED',
            signal: SignalService.mapSignal(updated),
        };
    }

    static async getSignalById(signalId) {
        const signal = await SignalModel.findById(signalId);

        if (!signal) {
            return null;
        }

        return SignalService.mapSignal(signal);
    }

    static async getVisibleSignalById(signalId) {
        const signal = await SignalModel.findOne({ _id: signalId, status: 'active' });

        if (!signal) {
            return null;
        }

        return SignalService.mapSignal(signal);
    }

    static async getActiveSignals() {
        const items = await SignalModel.find({ status: 'active' })
            .sort({ publishedAt: -1, createdAt: -1, _id: -1 })
            .limit(50);

        return items.map(SignalService.mapSignal);
    }

    static async getAdminSignals() {
        const items = await SignalModel.find({})
            .sort({ createdAt: -1, _id: -1 })
            .limit(100);

        return items.map(SignalService.mapSignal);
    }
}

module.exports = SignalService;
