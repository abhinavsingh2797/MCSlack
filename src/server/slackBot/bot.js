const {
    showShareAlertModal
} = require('./block-kits/alert/share-alert-modal.js');
const { handleShareAlert } = require('./block-kits/alert/share-message.js');
const logger = require('../utils/logger');
const { createAlertMessage } = require('./block-kits/alert/alert-message.js');
const { WebClient } = require('@slack/web-api');
const webClient = new WebClient(process.env.SLACK_TOKEN);

/*
takes a payload containing the journey info and posts a slack message
*/
exports.sendAlert = async (payload) => {
    var journeys = payload.journeys;

    try {
        journeys.forEach((journey) => {
            journey.channel = payload.channel;
            journey.report = payload.report;
            journey.url = `https://mc.s7.exacttarget.com/cloud/#app/Journey%20Builder/%23${journey.id}/${journey.version}`;
            journey.date = payload.date;
            journey.dayOfWeek = payload.dayOfWeek;

            createAlertMessage(webClient, journey);
        });
        logger.verbose('Messages Sent to Slack');
    } catch (error) {
        logger.error(error);
    }
};

/**
 * When the user clicks the "Show Chart" button on the alert message, display a modal view with the chart template
 */

exports.showChart = async ({ ack, body, client }) => {
    await ack();
    try {
        const {
            buildAndShowChart
        } = require('./block-kits/chart/chart-button');
        buildAndShowChart(body, client);
    } catch (error) {
        logger.error(error);
    }
};

/**
 * When the user clicks the "Share Alert" button on the alert message, display a modal view with the required information for sharing the alert
 */
exports.shareAlert = async ({ ack, body, client }) => {
    await ack();
    try {
        await showShareAlertModal(client, body);
    } catch (error) {
        logger.error(error);
    }
};

/**
 * When the user clicks the "submit" button on the share alert modal, share the alert with the selected user/channel with the optional message
 */
exports.viewShareAlert = async ({ ack, body, view, client }) => {
    ack();

    try {
        await handleShareAlert(client, body, view);
    } catch (error) {
        logger.error(error);
    }
};
