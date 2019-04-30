﻿function newAAMastersPlottersTradingSimulationTrades() {

    const MODULE_NAME = "Trades Plotter";
    const INFO_LOG = false;
    const ERROR_LOG = true;
    const INTENSIVE_LOG = false;
    const logger = newWebDebugLog();
    logger.fileName = MODULE_NAME;

    let thisObject = {

        // Main functions and properties.

        initialize: initialize,
        finalize: finalize,
        container: undefined,
        getContainer: getContainer,
        setTimePeriod: setTimePeriod,
        setDatetime: setDatetime,
        draw: draw,
        recalculateScale: recalculateScale,

        /* Events declared outside the plotter. */

        onDailyFileLoaded: onDailyFileLoaded,

        // Secondary functions and properties.

        currentRecord: undefined
    };

    /* this is part of the module template */

    let container = newContainer();     // Do not touch this 3 lines, they are just needed.
    container.initialize();
    thisObject.container = container;

    let timeLineCoordinateSystem = newTimeLineCoordinateSystem();       // Needed to be able to plot on the timeline, otherwise not.

    let timePeriod;                     // This will hold the current Time Period the user is at.
    let datetime;                       // This will hold the current Datetime the user is at.

    let marketFile;                     // This is the current Market File being plotted.
    let fileCursor;                     // This is the current File Cursor being used to retrieve Daily Files.

    let marketFiles;                      // This object will provide the different Market Files at different Time Periods.
    let dailyFiles;                // This object will provide the different File Cursors at different Time Periods.

    /* these are module specific variables: */

    let trades = [];
    let headers;

    return thisObject;

    function finalize() {
        try {

            if (INFO_LOG === true) { logger.write("[INFO] finalize -> Entering function."); }

            /* Stop listening to the necesary events. */

            viewPort.eventHandler.stopListening("Zoom Changed", onZoomChanged);
            viewPort.eventHandler.stopListening("Offset Changed", onOffsetChanged);
            marketFiles.eventHandler.stopListening("Files Updated", onFilesUpdated);
            canvas.eventHandler.stopListening("Drag Finished", onDragFinished);
            thisObject.container.eventHandler.stopListening('Dimmensions Changed')

            /* Destroyd References */

            marketFiles = undefined;
            dailyFiles = undefined;

            datetime = undefined;
            timePeriod = undefined;

            marketFile = undefined;
            fileCursor = undefined;

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] finalize -> err = " + err.stack); }
        }
    }

    function initialize(pStorage, pExchange, pMarket, pDatetime, pTimePeriod, callBackFunction) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] initialize -> Entering function."); }

            /* Store the information received. */

            marketFiles = pStorage.marketFiles[0];
            dailyFiles = pStorage.dailyFiles[0];

            datetime = pDatetime;
            timePeriod = pTimePeriod;

            /* We need a Market File in order to calculate the Y scale, since this scale depends on actual data. */

            marketFile = marketFiles.getFile(ONE_DAY_IN_MILISECONDS);  // This file is the one processed faster. 

            recalculateScale();

            /* Now we set the right files according to current Period. */

            marketFile = marketFiles.getFile(pTimePeriod);
            fileCursor = dailyFiles.getFileCursor(pTimePeriod);

            /* Listen to the necesary events. */

            viewPort.eventHandler.listenToEvent("Zoom Changed", onZoomChanged);
            viewPort.eventHandler.listenToEvent("Offset Changed", onOffsetChanged);
            marketFiles.eventHandler.listenToEvent("Files Updated", onFilesUpdated);
            canvas.eventHandler.listenToEvent("Drag Finished", onDragFinished);

            /* Get ready for plotting. */

            recalculate();

            /* Ready for when dimmension changes. */

            thisObject.container.eventHandler.listenToEvent('Dimmensions Changed', function () {
                recalculateScale()
                recalculate();
            })

            callBackFunction();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> err = " + err.stack); }
        }
    }

    function getContainer(point) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] getContainer -> Entering function."); }

            let container;

            /* First we check if this point is inside this space. */

            if (this.container.frame.isThisPointHere(point) === true) {

                return this.container;

            } else {

                /* This point does not belong to this space. */

                return undefined;
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] getContainer -> err = " + err.stack); }
        }
    }

    function onFilesUpdated() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onFilesUpdated -> Entering function."); }

            let newMarketFile = marketFiles.getFile(timePeriod);

            if (newMarketFile !== undefined) {

                marketFile = newMarketFile;
                recalculate();
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onFilesUpdated -> err = " + err.stack); }
        }
    }

    function setTimePeriod(pTimePeriod) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] setTimePeriod -> Entering function."); }

            if (timePeriod !== pTimePeriod) {

                timePeriod = pTimePeriod;

                if (timePeriod >= _1_HOUR_IN_MILISECONDS) {

                    let newMarketFile = marketFiles.getFile(pTimePeriod);

                    if (newMarketFile !== undefined) {

                        marketFile = newMarketFile;
                        recalculate();
                    }

                } else {

                    let newFileCursor = dailyFiles.getFileCursor(pTimePeriod);

                    fileCursor = newFileCursor; // In this case, we explicitly want that if there is no valid cursor, we invalidate the data and show nothing.
                    recalculate();

                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] setTimePeriod -> err = " + err.stack); }
        }
    }

    function setDatetime(pDatetime) {

        if (INFO_LOG === true) { logger.write("[INFO] setDatetime -> Entering function."); }

        datetime = pDatetime;

    }

    function onDailyFileLoaded(event) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onDailyFileLoaded -> Entering function."); }

            if (event.currentValue === event.totalValue) {

                /* This happens only when all of the files in the cursor have been loaded. */

                recalculate();

            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onDailyFileLoaded -> err = " + err.stack); }
        }
    }

    function draw() {

        try {

            if (INTENSIVE_LOG === true) { logger.write("[INFO] draw -> Entering function."); }

            this.container.frame.draw();

            plotChart();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] draw -> err = " + err.stack); }
        }
    }

    function recalculate() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculate -> Entering function."); }

            if (timePeriod >= _1_HOUR_IN_MILISECONDS) {

                recalculateUsingMarketFiles();

            } else {

                recalculateUsingDailyFiles();

            }

            thisObject.container.eventHandler.raiseEvent("Trades Changed", trades);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculate -> err = " + err.stack); }
        }
    }

    function recalculateUsingDailyFiles() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateUsingDailyFiles -> Entering function."); }

            if (fileCursor === undefined) {
                trades = [];
                return;
            } // We need to wait

            if (fileCursor.files.size === 0) {
                trades = [];
                return;
            } // We need to wait until there are files in the cursor

            let daysOnSides = getSideDays(timePeriod);

            let leftDate = getDateFromPoint(viewPort.visibleArea.topLeft, thisObject.container, timeLineCoordinateSystem);
            let rightDate = getDateFromPoint(viewPort.visibleArea.topRight, thisObject.container, timeLineCoordinateSystem);

            let dateDiff = rightDate.valueOf() - leftDate.valueOf();

            let farLeftDate = new Date(leftDate.valueOf() - dateDiff * 1.5);
            let farRightDate = new Date(rightDate.valueOf() + dateDiff * 1.5);

            let currentDate = new Date(farLeftDate.valueOf());

            trades = [];



            while (currentDate.valueOf() <= farRightDate.valueOf() + ONE_DAY_IN_MILISECONDS) {

                let stringDate = currentDate.getFullYear() + '-' + pad(currentDate.getMonth() + 1, 2) + '-' + pad(currentDate.getDate(), 2);

                let dailyFile = fileCursor.files.get(stringDate);

                if (dailyFile !== undefined) {

                    for (let i = 0; i < dailyFile.length; i++) {

                        let record = {};

                        record.begin = dailyFile[i][0];
                        record.end = dailyFile[i][1];
                        record.status = dailyFile[i][2];
                        record.lastProfitPercent = dailyFile[i][3];
                        record.beginRate = dailyFile[i][4];
                        record.endRate = dailyFile[i][5];
                        record.exitType = dailyFile[i][6];
                        record.stopRate = dailyFile[i][7];

                        if (record.begin >= farLeftDate.valueOf() && record.end <= farRightDate.valueOf()) {

                            trades.push(record);

                            if (datetime.valueOf() >= record.begin && datetime.valueOf() <= record.end) {

                                thisObject.currentRecord = record;
                                thisObject.container.eventHandler.raiseEvent("Current Trade Changed", thisObject.currentRecord);

                            }
                        }
                    }
                }

                currentDate = new Date(currentDate.valueOf() + ONE_DAY_IN_MILISECONDS);
            }

            /* Lests check if all the visible screen is going to be covered by trades. */

            let lowerEnd = leftDate.valueOf();
            let upperEnd = rightDate.valueOf();

            if (trades.length > 0) {

                if (trades[0].begin > lowerEnd || trades[trades.length - 1].end < upperEnd) {

                    setTimeout(recalculate, 2000);

                    //console.log("File missing while calculating trades, scheduling a recalculation in 2 seconds.");

                }
            }

            //console.log("Olivia > recalculateUsingDailyFiles > total trades generated : " + trades.length);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateUsingDailyFiles -> err = " + err.stack); }
        }
    }

    function recalculateUsingMarketFiles() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateUsingMarketFiles -> Entering function."); }

            if (marketFile === undefined) { return; } // Initialization not complete yet.

            let daysOnSides = getSideDays(timePeriod);

            let leftDate = getDateFromPoint(viewPort.visibleArea.topLeft, thisObject.container, timeLineCoordinateSystem);
            let rightDate = getDateFromPoint(viewPort.visibleArea.topRight, thisObject.container, timeLineCoordinateSystem);

            let dateDiff = rightDate.valueOf() - leftDate.valueOf();

            leftDate = new Date(leftDate.valueOf() - dateDiff * 1.5);
            rightDate = new Date(rightDate.valueOf() + dateDiff * 1.5);

            trades = [];

            for (let i = 0; i < marketFile.length; i++) {

                let record = {};

                record.begin = marketFile[i][0];
                record.end = marketFile[i][1];
                record.status = marketFile[i][2];
                record.lastProfitPercent = marketFile[i][3];
                record.beginRate = marketFile[i][4];
                record.endRate = marketFile[i][5];
                record.exitType = marketFile[i][6];
                record.stopRate = marketFile[i][7];

                if (record.begin >= leftDate.valueOf() && record.end <= rightDate.valueOf()) {

                    trades.push(record);

                    if (datetime.valueOf() >= record.begin && datetime.valueOf() <= record.end) {

                        thisObject.currentRecord = record;
                        thisObject.container.eventHandler.raiseEvent("Current Trade Changed", thisObject.currentRecord);

                    }
                }
            }

            //console.log("Olivia > recalculateUsingMarketFiles > total trades generated : " + trades.length);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateUsingMarketFiles -> err = " + err.stack); }
        }
    }

    function recalculateScale() {

        try {

            if (timeLineCoordinateSystem.maxValue > 0) { return; } // Already calculated.

            let minValue = {
                x: MIN_PLOTABLE_DATE.valueOf(),
                y: 0
            };

            let maxValue = {
                x: MAX_PLOTABLE_DATE.valueOf(),
                y: nextPorwerOf10(USDT_BTC_HTH) / 4 // TODO: This 4 is temporary
            };


            timeLineCoordinateSystem.initialize(
                minValue,
                maxValue,
                thisObject.container.frame.width,
                thisObject.container.frame.height
            );

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateScale -> err = " + err.stack); }
        }
    }

    function plotChart() {

        try {

            let userPosition = getUserPosition()
            let userPositionDate = userPosition.point.x

            thisObject.container.eventHandler.raiseEvent("Current Trade Record Changed", undefined);

            let record;

            for (let i = 0; i < trades.length; i++) {

                record = trades[i];

                /* Send the current record to the panel */

                if (userPositionDate >= record.begin && userPositionDate <= record.end) {

                    let currentRecord = {
                    };
                    thisObject.container.eventHandler.raiseEvent("Current Trade Record Changed", currentRecord);
                }

                let recordPoint1 = {
                    x: record.begin,
                    y: record.beginRate
                };

                let recordPoint2 = {
                    x: record.end,
                    y: record.beginRate
                };

                let recordPoint3 = {
                    x: record.end,
                    y: record.endRate
                };

                let recordPoint4 = {
                    x: record.end,
                    y: record.stopRate
                };

                recordPoint1 = timeLineCoordinateSystem.transformThisPoint(recordPoint1);
                recordPoint2 = timeLineCoordinateSystem.transformThisPoint(recordPoint2);
                recordPoint3 = timeLineCoordinateSystem.transformThisPoint(recordPoint3);
                recordPoint4 = timeLineCoordinateSystem.transformThisPoint(recordPoint4);

                recordPoint1 = transformThisPoint(recordPoint1, thisObject.container);
                recordPoint2 = transformThisPoint(recordPoint2, thisObject.container);
                recordPoint3 = transformThisPoint(recordPoint3, thisObject.container);
                recordPoint4 = transformThisPoint(recordPoint4, thisObject.container);

                if (recordPoint2.x < viewPort.visibleArea.bottomLeft.x || recordPoint1.x > viewPort.visibleArea.bottomRight.x) {
                    continue;
                }

                recordPoint1 = viewPort.fitIntoVisibleArea(recordPoint1);
                recordPoint2 = viewPort.fitIntoVisibleArea(recordPoint2);
                recordPoint3 = viewPort.fitIntoVisibleArea(recordPoint3);
                recordPoint4 = viewPort.fitIntoVisibleArea(recordPoint4);

                let line1 = '';
                let line2 = '';

                switch (record.exitType) {
                    case 1: {
                        line1 = 'STOP';
                        break;
                    }
                    case 2: {
                        line1 = 'TP';
                        break;
                    }
                }

                if (record.lastProfitPercent < 0) {

                    line2 = (record.lastProfitPercent).toFixed(2) + ' %';

                } else {

                    line2 = (record.lastProfitPercent).toFixed(2) + ' %';
                }

                /* Draw the triangle  that represents the trade. */

                browserCanvasContext.beginPath();

                browserCanvasContext.moveTo(recordPoint1.x, recordPoint1.y);
                browserCanvasContext.lineTo(recordPoint2.x, recordPoint2.y);
                browserCanvasContext.lineTo(recordPoint3.x, recordPoint3.y);

                browserCanvasContext.closePath();

                let opacity = '0.25';

                if (record.lastProfitPercent > 0) {
                    browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.PATINATED_TURQUOISE + ', ' + opacity + ')';
                    browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.GREEN + ', ' + opacity + ')';
                } else {
                    browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.RED + ', ' + opacity + ')';
                    browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.RUSTED_RED + ', ' + opacity + ')';
                }

                if (userPositionDate >= record.begin && userPositionDate <= record.end) {
                    browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.TITANIUM_YELLOW + ', ' + opacity + ')';
                }

                browserCanvasContext.fill();

                browserCanvasContext.lineWidth = 1;
                browserCanvasContext.stroke();

                if (
                    recordPoint4.x < viewPort.visibleArea.topLeft.x + 250
                    ||
                    recordPoint4.x > viewPort.visibleArea.bottomRight.x - 250
                    ||
                    recordPoint4.y > viewPort.visibleArea.bottomRight.y - 100
                    ||
                    recordPoint4.y < viewPort.visibleArea.topLeft.y + 100
                ) {
                    // we do not write any text
                } else {


                    printLabel(line1, recordPoint2.x - (recordPoint2.x - recordPoint1.x) / 2 - line1.length * FONT_ASPECT_RATIO, recordPoint4.y - 30, '0.50', 12);
                    printLabel(line2, recordPoint2.x - (recordPoint2.x - recordPoint1.x) / 2 - line2.length * FONT_ASPECT_RATIO, recordPoint4.y - 15, '0.50', 12);


                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] plotChart -> err = " + err.stack); }
        }
    }


    function onZoomChanged(event) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onZoomChanged -> Entering function."); }

            recalculate();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onZoomChanged -> err = " + err.stack); }
        }
    }

    function onOffsetChanged() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onOffsetChanged -> Entering function."); }

            if (Math.random() * 100 > 95) {

                recalculate()
            };

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onOffsetChanged -> err = " + err.stack); }
        }
    }

    function onDragFinished() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onDragFinished -> Entering function."); }

            recalculate();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onDragFinished -> err = " + err.stack); }
        }
    }
}


















