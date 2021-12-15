const schedule = require("node-schedule");

const cron_scheduling = (val, hour, min) => ({
    minutely: `*/${val} * * * *`,
    hourly: `${min} */${val} * * *`,
    daily: `${min} ${hour} */${val} * *`
});

module.exports = {
    startScheduler(startTime, period, callbacksArr){
        // startTime format hh:mm:ss or hh:mm
        // period example values: minute, hourly, daily, 1m, 1h, 5hours, 3days, 2d
        let cronOpt = {};
        let splitTime = startTime ? startTime.split(":") : [];
        // if schedule startTime is valid
        if(splitTime.length){
            // updates the scheduler start time
            cronOpt.start = getCronStartTime(splitTime);
            // updates the scheduler rule (repetition) if period value is valid
            // else sets the period as "daily", repeats every day
            cronOpt.rule = getCronScheduling(period || "daily", splitTime[0], splitTime[1]);
        }else{
            // if schedule startTime is invalid 
            // starts 2min after the time the scheduler is called
            cronOpt.start = new Date(Date.now() + 120000);
            // updates the scheduler rule (repetition) if period value is valid
            // else sets the period as "daily", repeats every day
            cronOpt.rule = getCronScheduling(period || "daily", 0 , 0);
        }
        console.log(cronOpt);
        return callbacksArr.filter(fct => typeof fct === "function")
            .forEach(fct => schedule.scheduleJob(cronOpt, fct));
    },

    stopScheduler(schedulerList){
        schedulerList.forEach(sch => sch.cancel());
    }
}
function getCronStartTime(splitTime){
    const today = new Date();
    return new Date(today.getFullYear(),today.getMonth(), today.getDate(), splitTime[0], splitTime[1] , splitTime[2] || 0);
}
function getCronScheduling(period, hour, minute){

    if(Object.keys(cron_scheduling(1)).includes(period))
        return cron_scheduling(1, hour, minute)[period];
    else if(period.match(/([0-9]+)(?=m)/g))
        return cron_scheduling(period.match(/([0-9]+)(?=m)/g)).minutely;
    else if(period.match(/([0-9]+)(?=h)/g))
        return cron_scheduling(period.match(/([0-9]+)(?=h)/g), null, minute).hourly;
    else if(period.match(/([0-9]+)(?=d)/g))
        return cron_scheduling(period.match(/([0-9]+)(?=d)/g), hour, minute).daily;
    return cron_scheduling(1, 0, 0).daily;
}