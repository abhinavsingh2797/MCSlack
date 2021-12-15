exports.handleShareAlert = async (client, body, view) => {
    const messageInput =
        view.state.values.custom_message_block.custom_message_input.value;
    const fromUser = body.user.id;
    const selectedDestination =
        view.state.values.conversations_select_block.conversations_select_input
            .selected_conversation;

    const private_metadata = body.view.private_metadata.split(',');

    const messageRecord = await client.conversations.history({
        token: process.env.SLACK_TOKEN,
        channel: private_metadata[1],
        inclusive: true,
        limit: 1,
        latest: private_metadata[0],
        oldest: private_metadata[0]
    });

    //check whether the message is an attachment or normal message
    const messageTypeChecker = messageRecord.messages[0].attachments;
    let alertMessage = [];
    let isAttachmentMessage;

    if (typeof messageTypeChecker == 'object') {
        isAttachmentMessage = true;
        const alertBlocks = messageRecord.messages[0].attachments[0].blocks;
        for (let alertBlockIndex in alertBlocks) {
            if (alertBlockIndex) {
                alertMessage.push(
                    messageRecord.messages[0].attachments[0].blocks[
                        alertBlockIndex
                    ]
                );
            }
        }
    } else {
        isAttachmentMessage = false;
        const alertBlocks = messageRecord.messages[0].blocks;
        for (let alertBlockIndex in alertBlocks) {
            if (alertBlockIndex) {
                alertMessage.push(
                    messageRecord.messages[0].blocks[alertBlockIndex]
                );
            }
        }
    }

    const messageToShare = {
        messageInput,
        fromUser,
        selectedDestination,
        alertMessage,
        isAttachmentMessage
    };
    if (messageToShare.messageInput == null) {
        // Share an alert WITHOUT a custom message
        await client.chat.postMessage({
            channel: messageToShare.selectedDestination,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `<@${messageToShare.fromUser}> has shared the following message with you:`
                    }
                }
            ]
        });
    } else {
        // Share an alert WITH a custom message
        await client.chat.postMessage({
            channel: messageToShare.selectedDestination,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `<@${messageToShare.fromUser}> has shared the following message with you:\n>${messageToShare.messageInput}`
                    }
                }
            ]
        });
    }

    if (messageToShare.isAttachmentMessage) {
        //Send the message as an attachment message
        return client.chat.postMessage({
            channel: messageToShare.selectedDestination,
            user: body.user.id,
            attachments: [
                {
                    color: '#e50000',
                    blocks: messageToShare.alertMessage
                }
            ]
        });
    }

    //Send the message as a normal message
    return client.chat.postMessage({
        channel: messageToShare.selectedDestination,
        user: body.user.id,
        blocks: messageToShare.alertMessage
    });
};
