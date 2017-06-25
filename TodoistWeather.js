// ==UserScript==
// @name         Todoist Weather
// @namespace    https://daisuke.hiromitsu.com/
// @version      0.1
// @description  Todoistのタスク画面に天気予報情報を追加します。
// @author       daisuke718
// @match        https://todoist.com/app*
// @require https://code.jquery.com/jquery-2.1.4.min.js
// @require http://underscorejs.org/underscore-min.js
// @grant        GM_xmlhttpRequest
// @run-at document-idle
// @connect api.openweathermap.org
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    var TodoistWeatherConst = TodoistWeatherConst || {};
    TodoistWeatherConst = {
        CITY_ID: '<Input City ID here>',
        API_KEY: '<Input API Key here>'
    };

    var CacheManager = CacheManager || {};
    CacheManager = {
        taskList: {},
        time: null,
        getTaskList: function() {
            return this.taskList;
        },
        setTaskList: function(taskList) {
            this.taskList = taskList;
        },
        getTime : function() {
            return this.time;
        },
        setTime: function(time) {
            this.time = time;
        }
    };

    var mutationObserver = new MutationObserver(onChangeDisp);
    startObservation(mutationObserver);

    dispWeather();

    /**
      *  画面表示変更時処理
      */
    function onChangeDisp(mutationRecords, mutationObserver) {
        // 更新があったら一旦監視を切る
        mutationObserver.disconnect();

        // 天気情報表示処理
        dispWeather();

        // 監視再開
        startObservation(mutationObserver);
    }

    /**
      *  天気情報を画面に表示します。
      */
    function dispWeather() {
        var now = new Date();
        var taskList = getTaskList();
        if ( equalTaskList(taskList, CacheManager.getTaskList()) ) {
            // タスクリストが同じ場合
            if ( (now - CacheManager.getTime()) < (3 * 60 * 60 * 1000) ) {
                // 取得時間が3時間未満ならスキップ
                return;
            }
        } else {
            // タスクリストが変わっていれば
            // 強制的に更新
            CacheManager.setTaskList(taskList);
        }
        CacheManager.setTime(now);

        // 初期化
        $('.weather').remove();

        // 画面内の日付部分を取得
        var todoistDates = [];
        $('.h2_date').each(function() {
            var monthDay = $(this).text().match(/(\d+)月(\d+)日/);
            var todoistDateObj = new Object({
                month: monthDay[1],
                day: monthDay[2],
                count: 0,
                element: this
            });
            todoistDates.push(todoistDateObj);
        });
        var iconBaseURL =  'https://openweathermap.org/img/w/';

        // 天気情報取得して画面反映
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'http://api.openweathermap.org/data/2.5/forecast?id='+TodoistWeatherConst.CITY_ID+'&APPID='+TodoistWeatherConst.API_KEY,
            responseType: 'json',
            onload: function(data) {
                var responseJSON = JSON.parse(data.responseText);
                var iconList = new Object({});
                $('body').css({'position': 'relative'});


                $.each(responseJSON.list, function() {
                    var dt = new Date(this.dt * 1000);
                    var weatherInfo = this.weather[0];

                    $.each(todoistDates, function() {
                        if ( this.month == dt.getMonth() + 1 ) {
                            if ( this.day == dt.getDate() ) {
                                var element = $(this.element);
                                var offset = element.offset();
                                var top = offset.top - 25;
                                var left = offset.left + element.width() + this.count * 50;
                                var div = $('<div>', {
                                    style: 'position: absolute; top: ' + top + 'px; left: ' + left + 'px;',
                                    class: 'weather'
                                });
                                var img = $('<img>', {
                                    src: iconBaseURL + weatherInfo.icon + '.png',
                                    alt: weatherInfo.description
                                });
                                var imgDiv = $('<div>').append(img);
                                var hourDiv = $('<div>', {
                                    style: 'text-align: center; margin-top: -10px;'
                                }).text(dt.getHours());
                                div.append(imgDiv).append(hourDiv);

                                $('body').append(div);
                                this.count++;
                            }
                        }
                    });

                });
            }
        });
    }

    /**
      * 監視を開始します。
      */
    function startObservation(mutationObserver) {
        mutationObserver.observe(document.getElementById('editor'),  {
            childList: true,
            subTree: true
        });
    }

    /**
      * 変更検知用のタスクリストを取得します。
      */
    function getTaskList() {
        var taskList = {};
        $('.day_holder').each(function() {
            var dayHolder = $(this);
            var key = dayHolder.find('.h2_date').text();
            var value = dayHolder.find('.task_item').size();
            taskList[key] = value;
        });
        return taskList;
    }

    /**
      * 2つのタスクリストが等しいかどうかを検査します。
      */
    function equalTaskList(list1, list2) {
        return _.isEqual(list1, list2);
    }

})();
