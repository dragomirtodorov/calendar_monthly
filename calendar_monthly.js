/* Magic Mirror Module: calendar_monthly
 * v1.0 - June 2016 (Updated)
 *
 * By Ashley M. Kirchner <kirash4@gmail.com>
 * Beer Licensed (meaning, if you like this module, feel free to have a beer on me, or send me one.)
 */

Module.register("calendar_monthly", {

    // Module defaults
    defaults: {
        debugging: false,
        initialLoadDelay: 0,       // How many seconds to wait on a fresh start up.
        fadeSpeed: 2,              // How fast (in seconds) to fade out and in during a midnight refresh
        showHeader: true,          // Show the month and year at the top of the calendar
        cssStyle: "custom",        // which CSS style to use, 'clear', 'block', 'slate', or 'custom'
        updateDelay: 5,            // How many seconds after midnight before a refresh
    },

    // Required styles
    getStyles: function() {
        return [this.data.path + "/css/mcal.css", this.getThemeCss()];
    },

    getThemeCss: function() {
        return this.data.path + "/css/themes/" + this.config.cssStyle + ".css";
    },

    // Required scripts
    getScripts: function() {
        return ["moment.js"];
    },

    // Override start method
    start: function() {
        console.info("Starting module: " + this.name);
        // Set locale
        moment.locale(config.language);
        // Open socket communication
        this.sendSocketNotification("hello");
        // Calculate next midnight and add updateDelay
        var now = moment();
        this.midnight = moment([now.year(), now.month(), now.date() + 1]).add(this.config.updateDelay, "seconds");

        this.loaded = false;
        this.EventsList = [];
        this.cnt = 0;
        this.scheduleUpdate(this.config.initialLoadDelay * 1000);
    },

    create_month_table: function(shift) {
        var current_month = moment().add(shift, "month");
        var prev_month = moment().add(shift - 1, "month");
        var month = current_month.month();
        var year = current_month.year();
        var monthName = current_month.format("MMMM");
        var monthLength = current_month.daysInMonth();

        // Find first day of the month, LOCALE aware
        var startingDay = current_month.clone().date(1).weekday();

        var wrapper = document.createElement("table");
        wrapper.className = 'xsmall';
        wrapper.id = 'calendar-table';

        // Create THEAD section with month name and 4-digit year
        var header = document.createElement("tHead");
        var headerTR = document.createElement("tr");

        if (this.config.showHeader) {
            var headerTH = document.createElement("th");
            headerTH.colSpan = "7";
            headerTH.scope = "col";
            headerTH.id = "calendar-th";

            var headerMonthSpan = document.createElement("span");
            headerMonthSpan.id = "monthName";
            headerMonthSpan.innerHTML = monthName;

            var headerYearSpan = document.createElement("span");
            headerYearSpan.id = "yearDigits";
            headerYearSpan.innerHTML = year;

            var headerSpace = document.createTextNode(" ");

            headerTH.appendChild(headerMonthSpan);
            headerTH.appendChild(headerSpace);
            headerTH.appendChild(headerYearSpan);
            headerTR.appendChild(headerTH);
        }
        header.appendChild(headerTR);
        wrapper.appendChild(header);

        // Create TFOOT section -- currently used for debugging only
        var footer = document.createElement('tFoot');
        var footerTR = document.createElement("tr");
        footerTR.id = "calendar-tf";

        var footerTD = document.createElement("td");
        footerTD.colSpan = "7";
        footerTD.className = "footer";
        if (this.config.debugging) {
            footerTD.innerHTML = "Calendar currently in DEBUG mode!<br />Please see console log.";
        } else {
            footerTD.innerHTML = "&nbsp;";
        }

        footerTR.appendChild(footerTD);
        footer.appendChild(footerTR);
        wrapper.appendChild(footer);

        // Create TBODY section with day names
        var bodyContent = document.createElement("tBody");
        var bodyTR = document.createElement("tr");
        bodyTR.id = "calendar-header";

        for (var i = 0; i <= 6; i++) {
            var bodyTD = document.createElement("td");
            bodyTD.className = "calendar-header-day";
            bodyTD.innerHTML = current_month.clone().weekday(i).format("ddd");
            bodyTR.appendChild(bodyTD);
        }
        bodyContent.appendChild(bodyTR);
        wrapper.appendChild(bodyContent);

        // Create TBODY section with the monthly calendar
        var bodyContent = document.createElement("tBody");
        var day = 1;
        var nextMonthDay = 1;
        var weeks = 6; // Maximum of 6 weeks in a month view

        for (var week = 0; week < weeks; week++) {
            var bodyTR = document.createElement("tr");
            bodyTR.className = "weekRow";

            for (var weekday = 0; weekday <= 6; weekday++) {
                var bodyTD = document.createElement("td");
                bodyTD.className = "calendar-day";
                var squareDiv = document.createElement("div");
                squareDiv.className = "square-box";
                var squareContent = document.createElement("div");
                squareContent.className = "square-content";
                var squareContentInner = document.createElement("div");
                var innerSpan = document.createElement("span");

                if (week === 0 && weekday < startingDay) {
                    // First row, fill in empty slots with previous month's days
                    innerSpan.className = "monthPrev";
                    var prev_month_day = prev_month.clone().endOf('month').date() - (startingDay - weekday - 1);
                    innerSpan.innerHTML = prev_month_day;
                } else if (day > 0 && day <= monthLength) {
                    // Current month's days
                    if (day === moment().date() && shift === 0 && current_month.isSame(moment(), 'month')) {
                        innerSpan.id = "day" + day;
                        innerSpan.className = "today";
                    } else {
                        innerSpan.id = "day" + day;
                        innerSpan.className = "daily";
                        var event_type = this.has_event(day, month);
                        if (event_type > 0) {
                            if (event_type === 1) {
                                innerSpan.className = "event";
                            } else if (event_type === 2) {
                                innerSpan.className = "public_event";
                            }
                        }
                    }
                    innerSpan.innerHTML = day;
                    day++;
                } else {
                    // Fill in empty slots with next month's days
                    innerSpan.className = "monthNext";
                    innerSpan.innerHTML = nextMonthDay;
                    nextMonthDay++;
                }

                squareContentInner.appendChild(innerSpan);
                squareContent.appendChild(squareContentInner);
                squareDiv.appendChild(squareContent);
                bodyTD.appendChild(squareDiv);
                bodyTR.appendChild(bodyTD);
            }

            bodyContent.appendChild(bodyTR);

            // Stop creating weeks if all days are filled
            if (day > monthLength && nextMonthDay > 7) { // Allow one extra week for overflow
                break;
            }
        }

        wrapper.appendChild(bodyContent);

        return wrapper;
    },

    // Override dom generator
    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.className = "calendar-monthly";

        for (var i = -1; i < 2; i++) {
            var child = this.create_month_table(i);
            wrapper.appendChild(child);
        }

        this.loaded = true;
        return wrapper;
    },
    	/**
	 * Called by the MagicMirror² core when a notification arrives.
	 * @param {string} notification The identifier of the notification.
	 * @param {*} payload The payload of the notification.
	 * @param {Module} sender The module that sent the notification.
	 */
	notificationReceived (notification, payload, sender) {
		if (sender) {
			//Log.log(this.name + " received a module notification: " + notification + " from sender: " + sender.name);
            if (notification === "CALENDAR_EVENTS") {
                if (payload && Array.isArray(payload)) {
                    payload.forEach(event => {
                        const existingEventIndex = this.EventsList.findIndex(e => e.title === event.title);
                        if (existingEventIndex !== -1) {
                            this.EventsList[existingEventIndex] = event;
                        } else {
                            this.EventsList.push(event);
                        }
    
                        // Optional: You can log event details if needed
                        //console.log(`DDD Event added: ${event.title} on ${moment(parseInt(event.startDate)).format("YYYY-MM-DD")}`);
                        //var event_date = moment(parseInt(event.startDate));
            
                        //console.log(`DDD Event day ${event_date.day()} month ${event_date.month()} year ${event_date.year()} ${event.title}`);
                    });
                    console.log(`Getting events from my-calendar module: ${this.EventsList.length} events loaded.`);
                }
            } else {
                console.log(`Calendar received an unknown socket notification: ${notification}`);
            }
    
            if (this.loaded) {
                this.updateDom(this.config.fadeSpeed * 1000);
            }
		} else {
			Log.log(this.name + " received a system notification: " + notification);
		}
	},

    // Override socket notification handler.
    // socketNotificationReceived: function(notification, payload) {
    //     console.debug(`socketNotificationReceived ${notification}`);
    //     console.debug(`payload ${payload}`)
    //     if (notification === "CALENDAR_EVENTS") {
    //         if (payload && Array.isArray(payload)) {
    //             payload.forEach(event => {
    //                 const existingEventIndex = this.EventsList.findIndex(e => e.title === event.title);
    //                 if (existingEventIndex !== -1) {
    //                     this.EventsList[existingEventIndex] = event;
    //                 } else {
    //                     this.EventsList.push(event);
    //                 }

    //                 // Optional: You can log event details if needed
    //                 console.log(`Event added: ${event.title} on ${moment(parseInt(event.startDate)).format("YYYY-MM-DD")}`);
    //             });
    //             console.log(`Getting events from my-calendar module: ${this.EventsList.length} events loaded.`);
    //         }
    //     } else {
    //         console.log(`Calendar received an unknown socket notification: ${notification}`);
    //     }

    //     if (this.loaded) {
    //         this.updateDom(this.config.fadeSpeed * 1000);
    //     }
    // },

    // Return 0 - not an event day
    // Return 1 - personal event
    // Return 2 - public event i.e., official holiday
    has_event: function(today, month) {
        for (var i = 0; i < this.EventsList.length; i++) {
            var start_date = parseInt(this.EventsList[i].startDate);
            var event_date = moment(start_date);
            var event_day = event_date.date();
            var event_month = event_date.month();
            if (today === event_day && month === event_month) {
                // console.log(`DDD today ${today} month ${month}`);
                // console.log(`DDD Event day ${event_day} month ${event_month} year ${event_date.year()} ${this.EventsList[i].title}`);
    
                if (this.EventsList[i].class === "PUBLIC") {
                    return 2;
                }
                return 1;
            }
        }
        return 0;
    },

    scheduleUpdate: function(delay) {
        var nextReload;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextReload = delay;
        } else {
            nextReload = this.config.updateDelay * 1000;
        }

        var self = this;
        setTimeout(function() {
            self.reloadDom();
        }, nextReload);
    },

    reloadDom: function() {
        var now = moment();
        if (now.isAfter(this.midnight)) {
            this.updateDom(this.config.fadeSpeed * 1000);
            this.midnight = moment([now.year(), now.month(), now.date() + 1]).add(this.config.updateDelay, "seconds");
        }

        // Schedule next refresh at the next midnight
        var nextRefresh = this.midnight.diff(now, "milliseconds");
        this.scheduleUpdate(nextRefresh);
    },

});
