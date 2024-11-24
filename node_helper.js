// node_helper.js
const NodeHelper = require("node_helper");
const moment = require("moment");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node_helper for calendar_monthly");
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "hello") {
            // Fetch or generate calendar events here
            // For demonstration, sending dummy events after 2 seconds
            setTimeout(() => {
                const events = [
                    {
                        title: "Public Holiday",
                        startDate: moment().startOf('month').add(5, 'days').valueOf(),
                        class: "PUBLIC"
                    },
                    {
                        title: "Personal Event",
                        startDate: moment().startOf('month').add(10, 'days').valueOf(),
                        class: "PERSONAL"
                    }
                ];
                this.sendSocketNotification("CALENDAR_EVENTS", events);
            }, 2000);
        }
    }
});
