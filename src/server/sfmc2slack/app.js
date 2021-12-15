const database = require('../sfmc2slack/postgres');
const job = require('../sfmc2slack/job');
const scheduler = require('../../server/libs/scheduler');
const axios = require('axios').default;

const logger = require('../utils/logger');
let runningScheduler = [];

module.exports = {
    async start() {
        logger.info('sfmc2slack app started...');
        // pings heroku and slack servers
        // server start time will be 2 min after it has started
        startPingServerScheduler(null, 'hourly', [pingServer]);
    },

    async scheduleReplicateJourneysDefinitions() {
        const scheduleStartTime = await database.getValueByKey(
            'scheduleStartTime'
        );
        const schedulePeriod = await database.getValueByKey('schedulePeriod');
        if (runningScheduler.length) stopReplicateScheduler();
        runningScheduler = startReplicateScheduler(
            scheduleStartTime,
            schedulePeriod
        );
    }
};

async function startReplicateScheduler(startTime, period) {
    return scheduler.startScheduler(startTime, period, [
        job.replicateJourneyDefinitions
    ]);
}

function stopReplicateScheduler() {
    scheduler.stopScheduler(runningScheduler);
}

async function startPingServerScheduler(startTime, period, pingCallback) {
    return scheduler.startScheduler(startTime, period, pingCallback);
}

async function pingServer() {
    const res = await axios.get(
        `https://${process.env.HEROKU_APP_NAME}.herokuapp.com/sfmc2slack/ping`
    );
    if (res.status === 200) {
        logger.info(`✅  Server is up`);
    } else {
        throw new Error(`❌ Server is down`);
    }
}
