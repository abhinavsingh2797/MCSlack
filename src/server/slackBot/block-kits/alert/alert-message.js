exports.createAlertMessage = async (client, journey) => {
    const strJourney = JSON.stringify(journey);
    return client.chat.postMessage({
        channel: journey.channel,
        attachments: [
            {
                color: '#e50000',
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `:rotating_light: ALERT! ${journey.report} :rotating_light:`
                        }
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Journey:*\n<${journey.url}|${journey.name}>`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*When:*\n${journey.dayOfWeek} ${journey.date}`
                            }
                        ]
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Sent (monthly average):*\n${journey.monthlyAvg}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Sent (${journey.dayOfWeek}):*\n${journey.comparisonDay}`
                            }
                        ]
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    emoji: true,
                                    text: 'Raise Issue'
                                },
                                style: 'danger',
                                value: 'click_me_123',
                                action_id: 'raise_issue_button'
                            },
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    emoji: true,
                                    text: 'Show Chart'
                                },
                                style: 'primary',
                                value: strJourney,
                                action_id: 'show_chart_button'
                            },
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    emoji: true,
                                    text: 'Share Alert'
                                },
                                style: 'primary',
                                value: strJourney,
                                action_id: 'share_alert_button'
                            }
                        ]
                    }
                ]
            }
        ]
    });
}
