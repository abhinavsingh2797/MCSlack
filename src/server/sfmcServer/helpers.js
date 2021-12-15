const { getConnection, getConnections } = require('./auth');
const db = require('../sfmc2slack/postgres');
const logger = require('../utils/logger');
const Moment = require('moment');

async function getJourneyDefinitions(mid, modifiedDate) {
    if (!getConnection(mid)) {
        logger.error('MID not found in this Instance', mid);
        logger.info('Available Connections', getConnections());
        return [];
    }
    const url =
        '/interaction/v1/interactions?definitionType=Multistep&mostRecentVersionOnly=false&%24orderBy=modifiedDate%20desc&extras=activities';
    const baseUrl = url.split('?')[0];
    const queryParams = new URLSearchParams(url.split('?')[1]);
    queryParams.set('$pageSize', 1000);
    let page = 1;
    let collector = [];
    let shouldContinue = false;

    do {
        queryParams.set('$page', Number(page).toString());

        const temp = await getConnection(mid).rest.get(
            baseUrl + '?' + decodeURIComponent(queryParams.toString())
        );

        if (
            temp.items &&
            temp.items[temp.items.length - 1] &&
            new Date(temp.items[temp.items.length - 1].modifiedDate) >
                new Date(modifiedDate)
        ) {
            shouldContinue = true;
        }

        collector.push(...temp.items);

        if (Array.isArray(temp.items) && collector.length >= temp.count) {
            shouldContinue = false;
        } else {
            page++;
            shouldContinue = true;
            logger.info('Retrieving additional Journeys');
        }
    } while (shouldContinue);
    return collector;
}

//gets journey definitions for all mids and returns array of all journey definitions
exports.getAllJourneyDefinitions = async (mids) => {
    try {
        logger.info('Relevant MIDs', mids);
        const journeyDefinitions = mids.map(async (mid) => {
            return (await getJourneyDefinitions(mid, null)).map((def) => {
                def.mid = mid;
                return def;
            });
        });
        return Promise.all(journeyDefinitions);
    } catch (error) {
        logger.error('ERROR: ', error);
    }
    return [];
};
//gets activities for a given mid and activity type
async function getActivities(mid, types) {
    const relevantJourneys = await db.getJourneysByMID(mid);
    const activities = relevantJourneys
        .map((j) => {
            return j.activities
                .filter((a) => types.includes(a.type))
                .map((a) => {
                    a.mid = mid;
                    a.definitionId = j.definitionId;
                    return a;
                });
        })
        .flat();
    return activities;
}

exports.getAllActivities = async (mids, activityList) => {
    try {
        const allActivities = mids.map((mid) =>
            getActivities(mid, activityList)
        );
        return Promise.all(allActivities);
    } catch (error) {
        logger.error('ERROR: ', error);
    }
    return [];
};

//gets all activities for a journey between a given period
async function getActivityMetrics(mid, activity, start, end) {
    const res = await getConnection(mid).rest.post(
        `interaction/v1/interactions/${activity.definitionId}/activities/${activity.id}/timeseries`,
        { endDate: end, startDate: start }
    );
    const records = res.all
        .map((bucket) => {
            bucket.activityId = res.request.activityId;
            return Object.assign(bucket, {
                mid: mid,
                definitionId: activity.definitionId,
                activityId: activity.id,
                type: activity.type,
                name: activity.name
            });
        })
        .flat();
    return records;
}

exports.getAllMetrics = async (allActivities, mids, startDate, endDate) => {
    const activities = allActivities.flat();
    if (activities.length > 0) {
        try {
            const metrics = await mids
                .map(async (mid) =>
                    Promise.all(
                        activities.map(async (a) => {
                            return getActivityMetrics(
                                mid,
                                a,
                                startDate.format('YYYY-MM-DD'),
                                endDate.format('YYYY-MM-DD')
                            );
                        })
                    )
                )
                .flat();
            return Promise.all(metrics);
        } catch (error) {
            logger.error('ERROR: ', error);
        }
    }
    return [];
};

exports.getAnomalies = async (
    tolerance,
    threashold,
    mids,
    metricsForDaysAgo,
    averageForWeeks
) => {
    const yesterday = await db.getMetricsByDaysAgo(metricsForDaysAgo, mids);
    const averages = await db.getAverageMetrics(averageForWeeks, mids);
    // create map from averages
    const averagesMap = {};
    for (const a of averages) {
        averagesMap[a.id] = a;
    }
    // retrieve only relevant data from journeys running yesterday
    const anomalies = yesterday
        .filter((j) => averagesMap[j.id]) // remove this after testing
        .map((j) => {
            j.average = averagesMap[j.id].average;
            j.weekshistory = averagesMap[j.id].weekshistory;
            return j;
        })
        //only those outside tolerance AND above 10
        .filter((j) => {
            const diff = j.average - j.total;
            const percentage = diff / j.total;
            return Math.abs(percentage) >= tolerance && j.total >= threashold;
        });
    if (anomalies.length > 0) {
        // retrieve history for graph
        const history = await db.getTimeSeriesByIds(
            4,
            anomalies.map((a) => a.id),
            mids
        );

        const historyMap = {};
        for (const h of history) {
            if (historyMap[h.id] === undefined) {
                historyMap[h.id] = [];
            }
            historyMap[h.id].push({ date: h.bucket, total: h.total });
        }

        //add history via map to results
        return anomalies.map((a) => {
            const historyArray = historyMap[a.id].sort(
                (b, c) =>
                    new Moment(b.date).format('YYYY-MM-DD') -
                    new Moment(c.date).format('YYYY-MM-DD')
            );
            a.history = {
                dates: historyArray.map((b) =>
                    Moment(b.date).format('YYYY-MM-DD')
                ),
                values: historyArray.map((b) => b.total)
            };
            return a;
        });
    }
    return [];
};
