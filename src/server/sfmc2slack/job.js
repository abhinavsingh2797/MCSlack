const helper = require('../sfmcServer/helpers');
const db = require('../sfmc2slack/postgres');
const bot = require('../slackBot/bot');
const moment = require('moment');
const logger = require('../utils/logger');
const tolerance = 0.15;
const threashold = 10; //minimum threashold
const metricsForDaysAgo = 1; //Number of days when metrics should be calculated
const averageForWeeks = 4; //Number of last weeks total sends average should be calculated

exports.replicateJourneyDefinitions = async () => {
    // global setup
    const dateString = await db.getValueByKey('lastTimeSeries');
    const mids = JSON.parse(await db.getValueByKey('selectedBusinessUnits'));
    const endDate = moment().subtract(metricsForDaysAgo, 'days');
    const startDate = dateString
        ? moment(dateString, 'YYYY-MM-DD')
        : endDate.clone().subtract(30, 'days');
    const activities = await db.getValueByKey('selectedTypes');

    if (mids.length > 0) {
        //replicate Journeys
        const allJourneyDefinitions = await helper.getAllJourneyDefinitions(
            mids
        );
        await db.upsertJourneyDefinitions(allJourneyDefinitions.flat());

        //replicate relevant activities
        const allActivities = await helper.getAllActivities(mids, activities);
        const allMetrics = await helper.getAllMetrics(
            allActivities,
            mids,
            startDate,
            endDate
        );
        await db.upsertJourneyMetrics(allMetrics.flat(2));
        db.setValueByKey('lastTimeSeries', endDate.format('YYYY-MM-DD'));

        const anomalies = await helper.getAnomalies(
            tolerance,
            threashold,
            mids,
            metricsForDaysAgo,
            averageForWeeks
        );

        const channel = await db.getValueByKey('slackChannelId');
        const payload = {
            channel: channel,
            report: 'Journey Anomaly',
            date: moment(endDate).format('DD-MM-YYYY'),
            dayOfWeek: moment(endDate).format('dddd'),
            journeys: anomalies.map((a) => {
                return {
                    id: a.id,
                    version: a.version,
                    name: a.name,
                    memberId: a.mid,
                    monthlyAvg: a.average,
                    comparisonDay: a.total,
                    history: a.history
                };
            })
        };

        logger.info('Anomaly List:', payload);
        bot.sendAlert(payload);
    } else {
        logger.warn('NO MID selected');
    }
};
