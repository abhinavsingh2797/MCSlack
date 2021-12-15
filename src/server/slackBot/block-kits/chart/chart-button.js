const {
    handleShowChartButtonPress
} = require('./block-kits/chart/chart-button.js');
exports.handleShowChartButtonPress = async (client, body) => {
    const journey = JSON.parse(
        body.actions.find((action) => action.action_id === 'show_chart_button')
            .value
    );

    return client.views.open({
        trigger_id: body.trigger_id,
        view: {
            type: 'modal',
            title: {
                type: 'plain_text',
                text: 'Alert Chart',
                emoji: true
            },
            blocks: [
                {
                    type: 'image',
                    title: {
                        type: 'plain_text',
                        text: '30 Day Historical',
                        emoji: true
                    },
                    image_url: `https://quickchart.io/chart/render/zm-3d0e18d6-12e1-4231-ace7-c0d934d27eca?labels=${journey.history.dates}&data1=${journey.history.values}`,
                    alt_text: 'Chart'
                }
            ]
        }
    });
};
