// Simple Express server setup to serve for local testing/dev API server
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const logger = require('./utils/logger');
const compression = require('compression');
const helmet = require('helmet');
const express = require('express');
const session = require('express-session');

const rateLimit = require('express-rate-limit');
const RedisRateLimit = require('rate-limit-redis');
const Redis = require('ioredis');
const auth = require('./sfmcServer/auth');
const sfmc2slack = require('./sfmc2slack/app');
const { App, ExpressReceiver } = require('@slack/bolt');

const bot = require('./slackBot/bot.js');

const redisClient = new Redis(process.env.REDIS_URL);

// static vars
const DIST_DIR = './dist';

const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    endpoints: {
        events: `/slack/events`
    }
});

const app = new App({
    token: process.env.SLACK_TOKEN,
    receiver
});

//add logging for all requests in debug mode
receiver.router.use(
    require('morgan')('tiny', {
        stream: { write: (message) => logger.http(message.trim()) }
    })
);

// add iframe protections, except frameguard which causes issues being rendered in iframe of SFMC
receiver.router.use(
    helmet({
        frameguard: false
    })
);
receiver.router.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'", '*.exacttarget.com'],
            scriptSrc: ["'self'", '*.exacttarget.com'],
            objectSrc: ["'none'"],
            imgSrc: ["'self'", '*.exacttarget.com', "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            upgradeInsecureRequests: []
        }
    })
);
receiver.router.use(compression());

receiver.router.use(express.urlencoded({ extended: true }));
receiver.router.use(express.text({ type: 'text/plain', limit: '10mb' }));
receiver.router.use(express.json());
receiver.router.use(express.raw({ type: 'application/jwt' }));

// used for holding session store over restarts
let RedisStore = require('connect-redis')(session);
receiver.app.set('trust proxy', 1);

receiver.router.use(
    session({
        store: new RedisStore({ client: redisClient }),
        secret: process.env.SECRET_TOKEN,
        cookie: {
            secure: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'none',
            httpOnly: true
        },
        resave: false,
        saveUninitialized: false
    })
);
// Rate Limit API requests
// we exclude routes ending with execute since these may be used
// thousands of times be Journey Builder in short period
receiver.router.use(
    /.*[^execute]$/,
    rateLimit({
        store: new RedisRateLimit({
            client: redisClient
        }),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100
    })
);

receiver.router.get('/session', (req, res) => {
    res.json({ success: true, session: req.session });
});

// setup connections in advance
auth.initConnections(Number(process.env.SFMC_EID));
//generic SFMC endpoint which has some helpful things in
receiver.router.use('/sfmc', require('./sfmc/sfmc-api.js'));

//put your custom endpoints here
receiver.router.use('/sfmc2slack', require('./sfmc2slack/sfmc2slack-api.js'));

//set up slack middleware
// receiver.router.use(app.receiver.router);
//slack app events endpoint
app.action('show_chart_button', bot.showChart);
app.action('share_alert_button', bot.shareAlert);
app.action('view_share_alert', bot.viewShareAlert);

receiver.router.use(express.static(DIST_DIR));

const serverOptions = {};
if (process.env.NODE_ENV !== 'production') {
    //local version
    const path = require('path');
    const fs = require('fs');
    serverOptions.key = fs.readFileSync(
        path.join(__dirname, '..', '..', 'certificates', 'private.key'),
        'ascii'
    );
    serverOptions.cert = fs.readFileSync(
        path.join(__dirname, '..', '..', 'certificates', 'private.crt'),
        'ascii'
    );
}

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000, serverOptions);
    sfmc2slack.start();
    logger.info('⚡️ Bolt app is running!');
})();
