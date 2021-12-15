import { LightningElement, track } from 'lwc';
import { getCookieByName } from 'common/utils';

export default class Config extends LightningElement {
    @track config = {};
    @track isEditing = false;
    @track isLoading = true;
    @track isReady = false;

    get periods() {
        return [
            { label: 'Every 5 Minutes', value: '5min' },
            { label: 'Every 15 Minutes', value: '15min' },
            { label: 'Every 30 Minutes', value: '30min' },
            { label: 'Every Hour', value: 'hourly' },
            { label: 'Every 12 Hours', value: '12hours' },
            { label: 'Every Day', value: 'daily' }
        ];
    }

    onscheduleperiodchange(e) {
        this.config.schedulePeriod = e.detail.value;
    }
    onslackchannelidchange(e) {
        this.config.slackChannelId = e.detail.value;
    }
    ontimechange(e) {
        this.config.scheduleStartTime = e.detail.value;
    }

    handleSelectedBusinessUnits(e) {
        console.log(e);
        this.config.selectedBusinessUnits = e.detail.value;
    }
    handleSelectedTypes(e) {
        console.log(e);
        this.config.selectedTypes = e.detail.value;
    }

    async handleForceResync() {
        const rawRes = await fetch('/sfmc2slack/forceResync', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'xsrf-token': getCookieByName.call(this, 'XSRF-TOKEN')
            },
            redirect: 'follow'
        });

        const jsonRes = await rawRes.json();
        console.log(jsonRes);
        if (rawRes.status < 300 && jsonRes) {
            this.config = Object.assign(this.config, jsonRes);
            this.isLoading = false;
            this.isReady = true;
            console.log(JSON.parse(JSON.stringify(this.config)));
        } else {
            this.dispatchEvent(
                new CustomEvent('error', {
                    bubbles: true,
                    detail: {
                        type: 'error',
                        message: jsonRes
                    }
                })
            );
            this.isLoading = false;
        }
    }

    async saveConfig() {
        this.isLoading = true;
        console.log({
            selectedBusinessUnits: this.config.selectedBusinessUnits,
            selectedTypes: this.config.selectedTypes,
            slackChannelId: this.config.slackChannelId,
            scheduleStartTime: this.config.scheduleStartTime,
            schedulePeriod: this.config.schedulePeriod
        });
        //TODO add error handling
        await fetch('/sfmc2slack/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xsrf-token': getCookieByName.call(this, 'XSRF-TOKEN')
            },
            redirect: 'follow',
            body: JSON.stringify({
                selectedBusinessUnits: this.config.selectedBusinessUnits,
                selectedTypes: this.config.selectedTypes,
                slackChannelId: this.config.slackChannelId,
                scheduleStartTime: this.config.scheduleStartTime,
                schedulePeriod: this.config.schedulePeriod
            })
        });
        this.isLoading = false;
    }

    async getConfig() {
        const rawRes = await fetch('/sfmc2slack/config', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'xsrf-token': getCookieByName.call(this, 'XSRF-TOKEN')
            },
            redirect: 'follow'
        });

        const jsonRes = await rawRes.json();
        console.log(jsonRes);
        if (rawRes.status < 300 && jsonRes) {
            this.config = Object.assign(this.config, jsonRes);
            this.isLoading = false;
            this.isReady = true;
        } else {
            this.dispatchEvent(
                new CustomEvent('error', {
                    bubbles: true,
                    detail: {
                        type: 'error',
                        message: jsonRes
                    }
                })
            );
            this.isLoading = false;
        }
    }

    async connectedCallback() {
        this.isLoading = true;
        this.getConfig();
    }
}
