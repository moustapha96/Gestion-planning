const { autoCloseExpiredMeetings } = require('../services/meeting.service');
const { logger } = require('../utils/logger');

async function runMeetingAutoClose(prisma) {
    try {
        return await autoCloseExpiredMeetings(prisma);
    } catch (error) {
        logger.error('MEETING_AUTO_CLOSE_CRON', error.message, { stack: error.stack });
        return 0;
    }
}

module.exports = {
    runMeetingAutoClose,
};

