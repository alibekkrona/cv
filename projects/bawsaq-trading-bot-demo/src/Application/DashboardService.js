const UserService = require('./UserService');

class DashboardService {
    static async getSummary() {
        const userCount = await UserService.countUsers();

        return {
            botStatus: 'RUNNING',
            dbStatus: 'OK',
            userCount,
            activity: [
                { label: 'Mon', value: 36 },
                { label: 'Tue', value: 52 },
                { label: 'Wed', value: 44 },
                { label: 'Thu', value: 68 },
                { label: 'Fri', value: 74 },
                { label: 'Sat', value: 58 },
                { label: 'Sun', value: 82 },
            ],
        };
    }
}

module.exports = DashboardService;