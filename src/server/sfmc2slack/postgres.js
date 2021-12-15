/**
 * @namespace server/postgres
 */

const pgp = require('pg-promise')();
const pgdb = pgp({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pgdb.connect();

/**
 * columns set for insert example
 */

const configurationColumnSet = new pgp.helpers.ColumnSet(
    [{ name: 'key' }, { name: 'value' }],
    { table: 'Configuration' }
);

const JourneyDefinitionColumnSet = new pgp.helpers.ColumnSet(
    [
        { name: 'definitionId' },
        { name: 'key' },
        { name: 'name' },
        { name: 'version' },
        { name: 'createdDate' },
        { name: 'modifiedDate' },
        { name: 'status' },
        { name: 'id' },
        { name: 'mid' },
        { name: 'activities', cast: 'jsonb[]' }
    ],
    { table: 'JourneyDefinitions' }
);
const JourneyActivityTimeSeriesColumnSet = new pgp.helpers.ColumnSet(
    [
        { name: 'activityId' },
        { name: 'bucket' },
        { name: 'mid' },
        { name: 'definitionId' },
        { name: 'type' },
        { name: 'name' },
        { name: 'total', def: 0 }
    ],
    { table: 'JourneyActivityTimeSeries' }
);

exports.getValueByKey = async (key) => {
    const res = await pgdb.any({
        name: 'getValueByKey',
        text: `SELECT value FROM public."Configuration" WHERE key = $1`,
        values: [key]
    });
    return res.length === 1 ? res[0].value : null;
};
exports.setValueByKey = async (key, value) => {
    const query =
        pgp.helpers.insert({ key: key, value: value }, configurationColumnSet) +
        ` ON CONFLICT ON CONSTRAINT KEY DO UPDATE SET value ='${value}'`;

    return pgdb.any(query, null);
};

exports.removeValueByKey = (key) => {
    return pgdb.none({
        name: 'removeValueByKey',
        text: `DELETE FROM public."Configuration" WHERE key = $1`,
        values: [key]
    });
};
exports.upsertJourneyDefinitions = async (journeyDefinition) => {
    if (journeyDefinition.length > 0) {
        const insertQuery = pgp.helpers.insert(
            journeyDefinition,
            JourneyDefinitionColumnSet
        );

        // let's assume columns 'first' and 'second' produce conflict when exist:
        const onConflict =
            ' ON CONFLICT("definitionId") DO UPDATE SET ' +
            JourneyDefinitionColumnSet.assignColumns({
                from: 'EXCLUDED',
                skip: ['id', 'definitionId']
            });
        return pgdb.any(insertQuery + ' ' + onConflict, null);
    }
    return null;
};

exports.upsertJourneyMetrics = async (metrics) => {
    if (metrics.length > 0) {
        const query =
            pgp.helpers.insert(metrics, JourneyActivityTimeSeriesColumnSet) +
            ' ON CONFLICT  DO NOTHING';
        return pgdb.any(query, null);
    }
    return null;
};

exports.getJourneysByMID = async (mid) => {
    //gets anything published or unpublished which was changed yesterday (ie. a version which was active yesterday)
    return pgdb.any({
        name: 'getJourneys',
        text: `SELECT "definitionId", status, activities FROM public."JourneyDefinitions" WHERE mid = $1 AND (status = 'Published' OR (status = 'Unpublished' AND DATE_PART('day', CURRENT_DATE - "modifiedDate") <= 1))`,
        values: [mid]
    });
};

exports.getJourneysByDefinitionID = async (journeyDefinitions) => {
    //gets anything published or unpublished which was changed yesterday (ie. a version which was active yesterday)
    let query = `SELECT "definitionId", status, name FROM public."JourneyDefinitions" WHERE "definitionId" IN ($1:list) AND (status = 'Published' OR (status = 'Unpublished' AND DATE_PART('day', CURRENT_DATE - "modifiedDate") <= 1))`;

    return pgdb.any(query, journeyDefinitions);
};

exports.getJourneysMetricsToCompare = async (dateString) => {
    //gets anything published or unpublished which was changed yesterday (ie. a version which was active yesterday)

    const query = `SELECT "activityId", bucket, mid, "definitionId", type, name, total FROM public."JourneyActivityTimeSeries" WHERE bucket IN ($1:list) `;

    return pgdb.any(query, [dateString]);
};

exports.getMetricsByDaysAgo = async (daysAgo, mids) => {
    const query = `SELECT b.name,
    c.total,
    c.id,
    b.mid,
    c.version
FROM
 ( SELECT 
    SUM(a.total) AS total,
    j.id,
    j.version
  FROM public."JourneyActivityTimeSeries_JDE" AS a
  INNER JOIN public."JourneyDefinitions" AS j ON a."definitionId" = j."definitionId"
  WHERE DATE(a.bucket) = current_date -$1
  GROUP BY j.id, j.version ) AS c
INNER JOIN public."JourneyDefinitions" AS b ON c."id" = b."id"
WHERE b.status ='Published' 
AND  b.mid IN ($2:list)`;
    return pgdb.any(query, [daysAgo, mids]);
};

exports.getAverageMetrics = async (weeksAgo, mids) => {
    //gets anything published or unpublished which was changed yesterday (ie. a version which was active yesterday)
    const query = `SELECT b.name,
    ROUND(AVG(c.total)) AS average,
    c.id,
    b.mid,
    count(*) AS weeksHistory
FROM
 ( SELECT sum(a.total) AS total, a.bucket,
          j.id
  FROM public."JourneyActivityTimeSeries_JDE" AS a
  INNER JOIN public."JourneyDefinitions" AS j ON a."definitionId" = j."definitionId"
  WHERE EXTRACT(DOW
                FROM a.bucket) = EXTRACT(DOW
                                         FROM current_date -1)
      AND a.bucket >= NOW() - INTERVAL '$1 Weeks'
  GROUP BY j.id, a.bucket ) AS c
INNER JOIN public."JourneyDefinitions" AS b ON c."id" = b."id"
WHERE b.status ='Published' AND b.mid IN ($2:list)
GROUP BY b.name, c.id, b.mid`;

    return pgdb.any(query, [weeksAgo, mids]);
};

exports.getTimeSeriesByIds = async (weeksHistory, ids, mids) => {
    const query = `SELECT sum(a.total) AS total, j.id, a.bucket FROM public."JourneyActivityTimeSeries_JDE" AS a 
    INNER JOIN public."JourneyDefinitions" AS j ON a."definitionId" = j."definitionId"
    WHERE  a.bucket >= NOW() - INTERVAL '$1 Weeks' AND j.id IN ($2:list) AND j.mid IN ($3:list)
    GROUP BY j.id, a.bucket`;

    return pgdb.any(query, [weeksHistory, ids, mids]);
};
