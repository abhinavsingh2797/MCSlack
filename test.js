if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const sch = require("./src/server/libs/scheduler");
const db = require('./src/server//sfmc2slack/postgres');
const auth = require('./src/server/sfmcServer/auth');
const jb = require('./src/server/sfmc2slack/job');

async function init() {
    await auth.initConnections(Number(process.env.SFMC_EID));
    const scheduleStartTime = await db.getValueByKey('scheduleStartTime');
    const schedulePeriod = await db.getValueByKey('schedulePeriod');
    sch.startScheduler(scheduleStartTime, schedulePeriod, [jb.replicateJourneyDefinitions]);
    const c = await jb.replicateJourneyDefinitions();
}
init();
