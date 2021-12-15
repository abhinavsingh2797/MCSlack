const SDK = require('sfmc-sdk');
const logger = require('../utils/logger');
const connections = {};

exports.getConnections = () => {
    return connections;
};

exports.getConnection = (mid) => {
    return connections[mid];
};

/*
gets a list of all Business Unites and establishes connection for each one
*/
exports.initConnections = async (eid) => {
    const eidConn = this.initConnection(eid);
    try {
        const businessUnits = await eidConn.soap.retrieve(
            'BusinessUnit',
            ['ID', 'Name'],
            { QueryAllAccounts: true }
        );
        for (const bu of businessUnits.Results) {
            connections[bu.ID] = this.initConnection(bu.ID);
        }
    } catch (err) {
        logger.error('error thrown', err.response.data);
    }
};

exports.initConnection = (mid) => {
    return new SDK(
        {
            client_id: process.env.SFMC_CLIENTID,
            client_secret: process.env.SFMC_CLIENTSECRET,
            auth_url: process.env.SFMC_AUTHURL,
            account_id: mid
        },
        true
    );
};
