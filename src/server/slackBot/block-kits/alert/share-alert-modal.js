exports.showShareAlertModal = async (client, body) => {
    return client.views.open({
        trigger_id: body.trigger_id,
        view: {
            type: 'modal',
            private_metadata: body.message.ts + ',' + body.channel.id,
            callback_id: 'view_share_alert',
            title: {
                type: 'plain_text',
                text: 'Share Alert',
                emoji: true
            },
            submit: {
                type: 'plain_text',
                text: 'Share',
                emoji: true
            },
            close: {
                type: 'plain_text',
                text: 'Cancel',
                emoji: true
            },
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: 'Custom Message:'
                    }
                },
                {
                    type: 'input',
                    block_id: 'custom_message_block',
                    optional: true,
                    label: {
                        type: 'plain_text',
                        text: 'Type a custom message below!',
                        emoji: true
                    },
                    element: {
                        type: 'plain_text_input',
                        action_id: 'custom_message_input',
                        multiline: true,
                        placeholder: {
                            type: 'plain_text',
                            text: 'For example: Please can you take a look at this alert.'
                        }
                    }
                },
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: 'Share Destination:'
                    }
                },
                {
                    block_id: 'conversations_select_block',
                    type: 'input',
                    label: {
                        type: 'plain_text',
                        text: 'Select a channel or user to share this alert to:'
                    },
                    element: {
                        action_id: 'conversations_select_input',
                        type: 'conversations_select'
                    }
                }
            ]
        }
    });
}
