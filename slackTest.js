if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const auth = require('./src/server/sfmcServer/auth');
const jobs = require('./src/server/sfmc2slack/job');
const messageSlack = require('./src/server/sfmc2slack/messageSlack');
const postgres = require('./src/server/sfmc2slack/postgres');
const moment = require('moment');
 
async function init() {
  var dates = [];
  var values = [];
  for(days = 30; days > 0; days--){
    let date = new Date();
    date.setDate(date.getDate()-days);
    dates.push(moment(date).format("DD-MMM"));
    values.push(Math.floor((Math.random() * 100) + 1));
  }
  console.log("dates ",dates, "values ", values);

  const channel = await postgres.getValueByKey("slackChannelid");
  const payload = {
    "channel": channel,
    "report": "Journey Anomaly",
    "date": "08-Sep-2021",
    "dayOfWeek": "Wednesday",
    "journeys": [
      {
        "id": "fc6a24f7-8ecb-4c5b-86ac-eb834b199d8b",
        "version": "1",
        "name": "Service Journey UK",
        "memberId": "10975785",
        "monthlyAvg": "431",
        "yesterday": "627",
        "history": {dates,values}
      }
    ]
  }
    await messageSlack.sendMessage2Slack(payload)
    // await auth.initConnections(Number(process.env.SFMC_EID));
    // await jobs.replicateHistory();
    // await jobs.replicateJourneyDefinitions();
    console.log('replicated');
    return true;
}
init();
