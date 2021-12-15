const express = require('express');
const router = express.Router({ strict: true });
const db = require('../sfmc2slack/postgres');
const { replicateJourneyDefinitions } = require('../sfmc2slack/job');
const csurf = require('csurf')();
const { checkAuth, getRedirectURL, soapRequest } = require('../sfmc/core.js');
const app = require('./app');
const logger = require('../utils/logger');

//default entry path with auth validation
router.get('/app', csurf, (req, res, next) => {
    res.cookie('XSRF-TOKEN', req.csrfToken(), {
        sameSite: 'none',
        secure: true
    });
    checkAuth(req, res, next, req.originalUrl.substring(1));
});

router.get('/ping', csurf, (req, res) => {
    res.status(200).json('pinged!');
});

// path in case we want to force a refresh of token
router.get('/app/login', csurf, (req, res) => {
    res.redirect(
        301,
        getRedirectURL(req, req.originalUrl.replace('/login', '').substring(1))
    );
});

router.get('/context', (req, res) => {
    res.json(req.session.context);
});

router.get('/status', async (req, res) => {
    try {
        res.status(200).json('Ok');
    } catch (ex) {
        res.status(500).json({ message: ex.message });
    }
});

router.get('/config', async (req, res) => {
    const result = await soapRequest(
        {
            RetrieveRequestMsg: {
                RetrieveRequest: {
                    QueryAllAccounts: true,
                    ObjectType: 'BusinessUnit',
                    Properties: ['ID', 'Name']
                }
            }
        },
        'Retrieve',
        req.session.auth
    );

    const options = result.Results.map((a) => {
        return {
            value: a.ID[0].toString(),
            label: a.Name[0],
            key: a.ID[0]
        };
    });
    const config = {
        availableBusinessUnits: options,
        selectedBusinessUnits:
            JSON.parse(await db.getValueByKey('selectedBusinessUnits')) || [],
        availableTypes: [
            { value: 'EmailV2', label: 'Email', key: 'EmailV2' },
            {
                value: 'ACTIVEAUDIENCEJOURNEYACTIVITY',
                label: 'Advertising Studio Audience',
                key: 'ACTIVEAUDIENCEJOURNEYACTIVITY'
            },
            {
                value: 'INAPPSYNCACTIVITY',
                label: 'In-App Message',
                key: 'INAPPSYNCACTIVITY'
            },
            {
                value: 'PUSHINBOXACTIVITY',
                label: 'Inbox Message',
                key: 'PUSHINBOXACTIVITY'
            },
            { value: 'SENDTOLINESYNC', label: 'Line', key: 'SENDTOLINESYNC' },
            {
                value: 'PUSHNOTIFICATIONACTIVITY',
                label: 'Push',
                key: 'PUSHNOTIFICATIONACTIVITY'
            },
            { value: 'SMSSYNC', label: 'SMS', key: 'SMSSYNC' },
            {
                value: 'UPDATECONTACTDATA',
                label: 'Update Contact',
                key: 'UPDATECONTACTDATA'
            },
            {
                value: 'WHATSAPPACTIVITY',
                label: 'WhatsApp',
                key: 'WHATSAPPACTIVITY'
            }
        ],
        selectedTypes:
            JSON.parse(await db.getValueByKey('selectedTypes')) || [],
        slackChannelId: await db.getValueByKey('slackChannelId'),
        lastSynced: await db.getValueByKey('lastTimeSeries'),
        scheduleStartTime: await db.getValueByKey('scheduleStartTime'),
        schedulePeriod: await db.getValueByKey('schedulePeriod')
    };
    res.json(config);
});
router.post('/config', async (req, res) => {
    logger.info('saving config', req.body);
    const updateResult = await Promise.all([
        db.setValueByKey(
            'selectedBusinessUnits',
            JSON.stringify(req.body.selectedBusinessUnits)
        ),
        db.setValueByKey(
            'selectedTypes',
            JSON.stringify(req.body.selectedTypes)
        ),
        db.setValueByKey('slackChannelId', req.body.slackChannelId),
        db.setValueByKey('scheduleStartTime', req.body.scheduleStartTime),
        db.setValueByKey('schedulePeriod', req.body.schedulePeriod)
    ]);
    await app.scheduleReplicateJourneysDefinitions();
    res.json(updateResult);
});
router.get('/forceResync', async (req, res) => {
    logger.info('Refreshing Data and running Job');
    await db.removeValueByKey('lastTimeSeries', null);
    replicateJourneyDefinitions();
    res.status(201).json('Accepted');
});

module.exports = router;
