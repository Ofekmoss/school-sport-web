String.prototype.compareTo = function(s) {
    return (this == s) ? 0 : ((this > s) ? -1 : 1);
};

String.prototype.endsWith = function(s) {
    return this.toLowerCase().lastIndexOf(s.toLowerCase()) == this.length - s.length;
};

String.prototype.startsWith = function(s) {
    return this.toLowerCase().indexOf(s.toLowerCase()) == 0;
};

String.prototype.startsWithEnglishLetter = function() {
    if (this.length > 0) {
        var firstLetter = this.charAt(0).toLowerCase();
        return firstLetter >= 'a' && firstLetter <= 'z';
    }
    return false;
};

Array.prototype.sortByProperty = function(propertyName) {
    this.sort(function(item1, item2) {
        var value1 = item1[propertyName];
        var value2 = item2[propertyName];
        if (value1 < value2)
            return -1;
        if (value1 > value2)
            return 1;
        return 0;
    });
};

Array.prototype.setForAll = function(propertyName, value) {
    this.forEach(function(item) {
        item[propertyName] = value;
    });
};

Array.prototype.take = function(amount) {
    var items = [];
    var array = this;
    for (var i = 0; i < array.length; i++) {
        if (items.length >= amount)
            break;
        items.push(array[i]);
    }
    return items;
};

Array.prototype.partialJoin = function(delimeter, indices) {
    var items = [];
    var array = this;
    for (var i = 0; i < indices.length; i++) {
        var curIndex = indices[i];
        if (curIndex >= 0 && curIndex < array.length)
            items.push(array[curIndex]);
    }
    return items.join(delimeter);
};

Array.prototype.skip = function(amount) {
    var items = [];
    var array = this;
    for (var i = amount; i < array.length; i++) {
        items.push(array[i]);
    }
    return items;
};

Array.prototype.SplitByProperty = function(propertyName) {
    if (typeof propertyName == 'undefined' || !propertyName)
        return {};

    var array = this;
    var mapping = {};
    for (var i = 0; i < array.length; i++) {
        var curItem = array[i];
        var key = curItem[propertyName].toString();
        if (!mapping[key])
            mapping[key] = [];
        mapping[key].push(curItem);
    }
    return mapping;
};

Array.prototype.expand = function(item, amount, complex) {
    if (typeof complex == 'undefined')
        complex = false;
    function GetClone() {
        if (complex) {
            var clone = {};
            for (var prop in item) {
                clone[prop] = item[prop];
            }
            return clone;
        } else {
            return item;
        }
    }
    for (var i = this.length; i < amount; i++) {
        this.push(GetClone());
    }
};

Array.prototype.trimAfter = function(amount) {
    this.splice(amount);
};

Array.prototype.removeItem = function(value, index) {
    var array = this;
    if (typeof index == 'undefined')
        index = array.indexOf(value);
    if (index >= 0) {
        array.splice(index, 1);
    }
};

Array.prototype.indexOf = function(item) {
    var array = this;
    var index = -1;
    for (var i = 0; i < array.length; i++) {
        if (array[i] == item) {
            index = i;
            break;
        }
    }
    return index;
};

Array.prototype.moveItem = function(oldIndex, newIndex) {
    var array = this;
    array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
};

Array.prototype.appendArray = function(otherArray) {
    if (otherArray != null && otherArray.hasOwnProperty('length')) {
        for (var i = 0; i < otherArray.length; i++) {
            this.push(otherArray[i]);
        }
    }
};

Array.prototype.mergeWith = function(otherArray) {
    var array = this;
    var mergedArray = [];
    for (var i = 0; i < array.length; i++)
        mergedArray.push(array[i]);
    if (typeof otherArray != 'undefined' && otherArray.length) {
        for (var i = 0; i < otherArray.length; i++) {
            mergedArray.push(otherArray[i]);
        }
    }
    return mergedArray;
};

Array.prototype.lastItem = function() {
    var array = this;
    return array.length == 0 ? null : array[array.length - 1];
};

Array.prototype.firstOrDefault = function(defaultValue) {
    var array = this;
    return array.length == 0 ? defaultValue : array[0];
};

if (![].findIndex) {
    Array.prototype.findIndex = function(callback) {
        var array = this;
        for (var i = 0; i < array.length; i++) {
            if (callback(array[i]) == true) {
                return i;
            }
        }
        return -1;
    };
}

if (![].findItem) {
    Array.prototype.findItem = function(callback) {
        var array = this;
        for (var i = 0; i < array.length; i++) {
            var curItem = array[i];
            if (callback(curItem) == true) {
                return curItem;
            }
        }
        return null;
    };
}

Array.prototype.toAssociativeArray = function(value, sourceProperty, targetProperty) {
    var array = this;
    if (typeof value == 'undefined')
        value = true;
    if (typeof sourceProperty == 'undefined')
        sourceProperty = '';
    if (typeof targetProperty == 'undefined')
        targetProperty = '';
    var mapping = {};
    for (var i = 0; i < array.length; i++) {
        var curItem = array[i];
        var key = (sourceProperty.length > 0 && curItem.hasOwnProperty(sourceProperty)) ?
            curItem[sourceProperty].toString() : curItem.toString();
        var currentValue = (targetProperty.length > 0 && curItem.hasOwnProperty(targetProperty)) ?
            curItem[targetProperty] : value;
        mapping[key] = currentValue;
    }
    return mapping;
};

Array.prototype.distinct = function() {
    var array = this;
    var mapping = {};
    var distinctItems = [];
    for (var i = 0; i < array.length; i++) {
        var x = array[i] == null ? '' : array[i];
        var key = x.toString();
        if (!mapping[key]) {
            distinctItems.push(x);
            mapping[key] = true;
        }
    }
    return distinctItems;
};

Array.prototype.Sum = function(propName) {
    if (typeof propName == 'undefined')
        propName = '';
    var array = this;
    if (propName.length > 0)
        array = array.map(function(x) { return x[propName]; });
    var sum = 0;
    for (var i = 0; i < array.length; i++) {
        var n = array[i] == null ? 0 : parseInt(array[i], 10);
        if (!isNaN(n))
            sum += n;
    }
    return sum;
};

Date.prototype.withoutTime = function () {
    var d = new Date(this);
    d.setHours(0, 0, 0, 0, 0);
    return d;
}

Date.prototype.isSameDate = function (otherDate) {
    var date = this;
    return date.getFullYear() == otherDate.getFullYear() && date.getMonth() == otherDate.getMonth() && date.getDate() == otherDate.getDate();
}

function getBooleanValue(value) {
    return typeof value === "string"
        ? ["1", "yes", "true"].indexOf(value.toLowerCase()) >= 0
        : !!value;
}

function IntegerTextboxKeyPress(evt) {
    var c = String.fromCharCode(evt.which);
    var n = parseInt(c);
    if (isNaN(n)) {
        evt.preventDefault();
    }
}

function IntegerTextboxBlur(evt) {
    var textbox = $(this);
    var curValue = textbox.val();
    if (curValue.length > 0) {
        var n = parseInt(curValue);
        if (!isNaN(n))
            textbox.val(n.toString());
    }
}

var sportGlobalSettings = {
    RecentAmount: 999,
    RecentFlowersContent: 8,
    YoungSportsmenSeq: 998,
    FlowersFieldSeq: 999,
    GeneralSportFieldSeq: 1000,
    LocalStorageKeys: {
        CurrentSeason: {
            Name: 'school_sport_season_name',
            Year: 'school_sport_season_hebrew_year'
        }
    }
};

var sportUtils = {
    scrollToTopInterval: 0,
    scrollToTopEventsAttached: false,
    scrollToTopCounter: 0,
    hebrewLetters: ['א','ב','ג', 'ד', 'ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'],
    grades: ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'", "ח'", "ט'", "י'", 'י"א', 'י"ב'],
    hebrewNumbers: {
        Asarot: ['', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'],
        OneToTenMale: ['אחד', 'שני', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה', 'עשרה'],
        OneToTenFemale: ['אחת', 'שתי', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר']
    },
    IsMobile: function() {
        var check = false;
        (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
        return check;
    },
    GetCurrentDate: function() {
        return new Date(); //(2016, 10, 3);
    },
    FocusElement: function(selector) {
        var element = $(selector).first();
        if (element.length == 1) {
            var oTextbox = $("input").attr("type", "text");
            oTextbox.prependTo(element);
            oTextbox.focus();
            oTextbox.remove();
            return window.scrollY;
        }
        return 0;
    },
    HideWhenFramed: function(elementsToHide) {
        var qs = sportUtils.ParseQueryString();
        if (qs['iframe'] == '1') {
            elementsToHide.forEach(function (elementToHide) {
                if (elementToHide.length > 0) {
                    $(elementToHide).hide();
                }
            });
        }
    },
    ApplyEnglishChampionship: function() {
        function SwitchThreeCells(row) {
            row.children("div").eq(0).appendTo(row);
            row.children("div").eq(1).prependTo(row);
        }

        function DelayedActions() {
            function ApplyItemsPosition(chooseFilterLabels) {
                for (var labelId in chooseFilterLabels) {
                    var oLabel = $("#" + labelId);
                    oLabel.parents(".col-lg-4").first().find(".tabs_nav>li").each(function() {
                        var oItem = $(this);
                        oItem.css("float", "left");
                    });
                }
            }

            var chooseFilterLabels = {
                "lblChoosePhase": "Choose phase",
                "lblChooseGroup": "Choose group",
                "lblChooseRound": "Choose round",
                "lblGamesPlan": "Games Plan",
                "lblTeamsList": "Teams List",
                "lblFacilitiesList": "Facilities List"
            };
            if ($("#pnlCategoryChooseFilters>div").length == 3) {
                $("#pnlCategoryChooseFilters>div").eq(0).appendTo($("#pnlCategoryChooseFilters"));
                $("#pnlCategoryChooseFilters>div").eq(1).prependTo($("#pnlCategoryChooseFilters"));
                $("#pnlGamesAndTeams>div").eq(0).appendTo($("#pnlGamesAndTeams"));
                $("#pnlTeamsList").css("text-align", "left");
                $("#pnlFacilitiesList").css("text-align", "left");
                $("#lblRankingTable").text("Ranking Table");
                $("#lblRankingTable").css("text-transform", "none");
                $("#pnlFullTableButton").removeClass("pull-left").addClass("pull-right");
                $("#lblFullTableButton").text("Full table");
                $("#lblRankingTableTeamName").text("Team Name");
                $("#lblRankingTableScore").text("Score");
                $("#lblFullTableButton")[0].style.setProperty("margin-left", "50px", "important");
                $("#lblFullTableButton").parents("a").first().css({"width": "200px", "height": "32px"});
                $(".tabs_container").each(function() {
                    this.style.setProperty("float", "left", "important")
                });
                for (var labelId in chooseFilterLabels) {
                    var oLabel = $("#" + labelId);
                    oLabel.text(chooseFilterLabels[labelId]);
                    oLabel.css({"text-align": "left", "text-transform": "none"});
                    oLabel.parents(".col-lg-4").first().find(".tabs_nav>li").each(function(index) {
                        if (labelId == "lblChoosePhase" && index == 0) {
                            $(this).text("All phases");
                        }
                        $(this).bind("click", function() {
                            window.setTimeout(function() {
                                ApplyItemsPosition(chooseFilterLabels);
                            }, 500);
                        });
                    });
                }
                ApplyItemsPosition(chooseFilterLabels);
                var arrWords = $("#lblFullChampionshipName").text().split(" ");
                if (arrWords.length > 2) {
                    var wordsWithoutHebrew = arrWords.take(arrWords.length - 2);
                    $("#lblFullChampionshipName").text(wordsWithoutHebrew.join(" "));
                }
                return;
            }
            window.setTimeout(DelayedActions, 100);
        }

        var qs = sportUtils.ParseQueryString();
        if (qs['English'] == '1' || qs['english'] == '1') {
            $(".section_title").css("text-align", "left");
            window.setTimeout(DelayedActions, 100);
            window.setInterval(function() {
                $("h3").css("text-align", "left");
                $(".match-group").css("direction", "ltr");
                $(".match-row").each(function() {
                    var oRow = $(this);
                    if (oRow.data("switched-cells") != "1") {
                        SwitchThreeCells(oRow);
                        oRow.data("switched-cells", "1");
                        oRow.find(".match-facility-container").css("text-align", "left");
                        oRow.find(".facility-label").text("Facility:");
                        oRow.find(".match-time-container").css("text-align", "left");
                        oRow.find(".time-label").text("Time:");
                        oRow.find(".match-delayed-game").hide();
                    }
                });
                $(".match-date-label").each(function() {
                    var oLabel = $(this);
                    if (oLabel.data("replaced-text") != "1") {
                        oLabel.text(oLabel.text().replace("תאריך:", "Date:"));
                        oLabel.data("replaced-text", "1");
                    }
                });
            }, 1000);
        }
    },
    MobileStyle: function(fullViewOnly, mobileOnly, showInBoth) {
        function StyleToAppend(originalStyle, newStyle) {
            var toAppend = '';
            if (newStyle.length > 0) {
                if (originalStyle.length > 0)
                    toAppend += ' ';
                toAppend += newStyle;
            }
            return toAppend;
        }

        if (typeof mobileOnly == 'undefined')
            mobileOnly = '';
        if (typeof showInBoth == 'undefined')
            showInBoth = '';
        var style = showInBoth;
        style += StyleToAppend(style, sportUtils.IsMobile() ? mobileOnly : fullViewOnly);
        return style;
    },
    TranslateGrade: function(rawGrade, latestSeason) {
        if (rawGrade != null && rawGrade > 0 && latestSeason != null) {
            var index = latestSeason - rawGrade;
            if (index >= 0 && index < sportUtils.grades.length)
                return sportUtils.grades[index];
        }
        return '';
    },
    WaitForElements: function(selectors, timeoutSeconds) {
        function CheckIfExists(deferred, numOfTries) {
            if ((numOfTries * 200) > (timeoutSeconds * 1000)) {
                deferred.reject('timeout');
            } else {
                var elements = {};
                var counter = 0;
                selectors.forEach(function(selector) {
                    var element = $(selector);
                    if (element.length > 0) {
                        elements[selector] = element;
                        counter++;
                    }
                });
                if (counter >= selectors.length) {
                    deferred.resolve(elements);
                } else {
                    window.setTimeout(function () {
                        CheckIfExists(deferred, numOfTries + 1);
                    }, 200);
                }
            }
        }

        var deferred = jQuery.Deferred();
        CheckIfExists(deferred, 0);
        return deferred.promise();
    },
    DoWhenReady: function(selector, action, tryCount) {
        if (typeof tryCount == 'undefined')
            tryCount = 0;

        //sanity check
        if (tryCount > 10000)
            return;

        var element = $(selector);
        if (element.length > 0) {
            action(element);
            return;
        }
        window.setTimeout(function() {
            sportUtils.DoWhenReady(selector, action, tryCount + 1);
        }, 2000);
    },
    CssWhenReady: function(selector, cssPropertyOrObject, cssValue) {
        sportUtils.DoWhenReady(selector, function(element) {
            var cssParams = null;
            if (typeof cssValue == 'undefined') {
                cssParams = cssPropertyOrObject;
            } else {
                cssParams = {};
                cssParams[cssPropertyOrObject] = cssValue;
            }
            element.css(cssParams);
        });
    },
    Login: function($q, $http, username, password) {
        var deferred = $q.defer();
        var userLogin = $.trim(username || '');
        var userPassword = password || '';
        if (userLogin.length > 0 && userPassword.length > 0) {
            $http.post("/api/login", {
                username: userLogin,
                password: userPassword
            }).then(function (resp) {
                var data = resp.data;
                window.localStorage.setItem('logged_username', userLogin);
                window.localStorage.setItem('logged_display_name', data.displayName);
                window.localStorage.setItem('logged_role', data.role);
                window.localStorage.setItem('logged_user_seq', data.seq);
                deferred.resolve(resp.data);
            }, function (data) {
                if (data && data.status == 401) {
                    deferred.reject('שם משתמש ו/או סיסמה שגויים');
                } else {
                    deferred.reject('שגיאה בעת התחברות');
                }
            });
        } else {
            deferred.reject('יש להזין שם  וסיסמא');
        }
        return deferred.promise;
    },
    IsValidEmail: function(rawEmail) {
        var email = $.trim((rawEmail ||'').toString());
        if (email.length == 0)
            return true;
        var parts = email.split('@');
        if (parts.length != 2)
            return false;
        var name = $.trim(parts[0]), domain = $.trim(parts[1]);
        if (name.length == 0 || domain.length == 0)
            return false;
        if (domain.substr(0, 1) == '.' || domain.substr(domain.length - 1, 1) == '.' || domain.indexOf('.') < 0)
            return false;
        return true;
    },
    ParseHebrewCurrency: function(rawSum) {
        function ParseParts(parts) {
            var parsed = '';
            parts = parts.filter(function(p) { return p.length > 0; });
            for (var i = 0; i < parts.length; i++) {
                var curPart = parts[i];
                if (i > 0) {
                    parsed += ' ';
                    if (parts.length > 1 && i == (parts.length - 1)) {
                        parsed += 'ו';
                        if (curPart == 'שני' || curPart == 'שתי')
                            curPart += 'ם';
                    }
                }
                parsed += curPart;
            }
            return parsed;
        }

        function ParseNumber(num, isMale, parts) {
            if (typeof parts == 'undefined')
                parts = [];

            num = Math.floor(num);
            if (num >= 100000)
                return num.toString();

            var thousands = Math.floor(num / 1000);
            if (thousands > 0) {
                var remainder = num % 1000;
                var hebrewThousands = '';
                if (thousands == 1)
                    hebrewThousands = 'אלף';
                else if (thousands == 2)
                    hebrewThousands = 'אלפיים';
                else
                    hebrewThousands = ParseNumber(thousands, false) + ' אלף';
                parts.push(hebrewThousands);
                var hebrewReminder = ParseNumber(remainder, isMale);
                parts.push(hebrewReminder);
                return ParseParts(parts);
            }

            var hundreds = Math.floor(num / 100);
            if (hundreds > 0) {
                var remainder = num % 100;
                var hebrewHundreds = '';
                if (hundreds == 1)
                    hebrewHundreds = 'מאה';
                else if (hundreds == 2)
                    hebrewHundreds = 'מאתיים';
                else
                    hebrewHundreds = ParseNumber(hundreds, false) + ' מאות';
                parts.push(hebrewHundreds);
                var hebrewReminder = ParseNumber(remainder, isMale);
                parts.push(hebrewReminder);
                return ParseParts(parts);
            }

            if (num <= 0)
                return ParseParts(parts);

            if (num == 1) {
                parts.push(isMale ? 'אחד' : 'אחת');
                return ParseParts(parts);
            }

            var oneToTenArray = isMale ? sportUtils.hebrewNumbers.OneToTenMale : sportUtils.hebrewNumbers.OneToTenFemale;
            if (num <= 10) {
                parts.push(oneToTenArray[num - 1]);
                return ParseParts(parts);
            }

            if (num % 10 == 0) {
                var asarot = Math.floor(num / 10);
                parts.push(sportUtils.hebrewNumbers.Asarot[asarot - 1]);
                return ParseParts(parts);
            }

            if (num < 20) {
                num -= 10;
                var hebrewWord = oneToTenArray[num - 1];
                if (num == 2)
                    hebrewWord += 'ם';
                var tenWord = isMale ? sportUtils.hebrewNumbers.OneToTenFemale[9] : sportUtils.hebrewNumbers.OneToTenMale[9];
                parts.push(hebrewWord + ' ' + tenWord);
                return ParseParts(parts);
            }

            var asarotReminder = num % 10;
            var asarotHebrew = ParseNumber(num - asarotReminder, false);
            parts.push(asarotHebrew);
            parts.push(ParseNumber(asarotReminder, isMale));
            return ParseParts(parts);
        }
        while (rawSum.indexOf(',') > 0)
            rawSum = rawSum.replace(',', '');
        rawSum = rawSum.replace('/', '.');
        rawSum = rawSum.replace('\\', '.');
        rawSum = rawSum.replace('|', '.');
        var totalShekels = parseFloat(rawSum);
        if (!isNaN(totalShekels)) {
            var integerPart = parseInt(totalShekels);
            var decimalPart = parseInt(((totalShekels % 1) * 100) + 0.5);
            if (integerPart > 0 && decimalPart >= 0) {
                var shkalimHebrew = ParseNumber(integerPart, true);
                if (integerPart == 1)
                    shkalimHebrew = 'שקל ' + shkalimHebrew;
                else
                    shkalimHebrew  += ' שקלים';
                var agorotHebrew = ParseNumber(decimalPart, false);
                var hebrewResult = shkalimHebrew + '';
                if (agorotHebrew.length > 0) {
                    if (decimalPart == 1)
                        agorotHebrew = 'אגורה ' + agorotHebrew;
                    else
                        agorotHebrew  += ' אגורות';
                    hebrewResult += ' ו' + agorotHebrew;
                }
                return hebrewResult + ' בלבד';
            }
        }
        return '';
    },
    IsValidInteger: function(rawValue) {
        return !isNaN(Number(rawValue)) && rawValue % 1 === 0;
    },
    IsValidPhoneNumber: function(rawPhoneNumber) {
        var phoneNumber = $.trim((rawPhoneNumber ||'').toString()).replace('+', '').replace('972', '').replace('-', '');
        if (phoneNumber.length == 0)
            return true;

        if (phoneNumber.length < 9)
            return false;

        return sportUtils.IsValidInteger(phoneNumber);
    },
    ParseQueryString: function(strQS) {
        if (typeof strQS == 'undefined' || strQS == null) {
            strQS = window.location.search || ''
            if (strQS.length == 0) {
                var strHash = window.location.hash || '';
                var index = strHash.indexOf('?');
                if (index >= 0) {
                    strQS = strHash.substr(index);
                }
            }
        }
        var mapping = {};
        if (strQS.indexOf('?') == 0) {
            var pairs = strQS.substr(1).split('&');
            for (var i = 0; i < pairs.length; i++) {
                var curPair = pairs[i];
                if (curPair.length > 0) {
                    var keyValue = curPair.split('=');
                    if (keyValue.length == 2 && keyValue[0].length > 0)
                        mapping[keyValue[0]] = keyValue[1] || '';
                }
            }
        }
        return mapping;
    },
    RemoveSpecialCharacters: function(rawValue) {
        var specialCharacters = '`~!@#$%^&*()-=_+/\\[]{};:\'"|,<>?';
        var cleanValue = '';
        for (var i = 0; i < rawValue.length; i++) {
            var curChar = rawValue.charAt(i);
            if (specialCharacters.indexOf(curChar) < 0)
                cleanValue += curChar;
        }
        return cleanValue;
    },
    GetHebrewLetter: function(letterIndex) {
        if (letterIndex != null && letterIndex) {
            var index = letterIndex - 1;
            if (index >= 0 && index < sportUtils.hebrewLetters.length)
                return sportUtils.hebrewLetters[index];
        }
        return '';
    },
    InitCustomSelect: function() {
        $('.custom_select').each(function () {
            var list = $(this).children('ul'),
                select = $(this).find('select'),
                title = $(this).find('.select_title');


            // select items to list items

            if ($(this).find('[data-filter]').length) {
                for (var i = 0, len = select.children('option').length; i < len; i++) {
                    list.append('<li data-filter="' + select.children('option').eq(i).data('filter') + '">' + select.children('option').eq(i).text() + '</li>')
                }
            }
            else {
                for (var i = 0, len = select.children('option').length; i < len; i++) {
                    list.append('<li>' + select.children('option').eq(i).text() + '</li>')
                }
            }
            select.hide();

            // open list

            title.on('click', function () {
                list.slideToggle(400);
                $(this).toggleClass('active');
            });

            // selected option

            list.on('click', 'li', function () {
                var val = $(this).text();
                title.text(val);
                list.slideUp(400);
                select.val(val);
                title.toggleClass('active');
            });

        });
    },
    ValidateUrl: function(rawUrl) {
        if (typeof rawUrl == 'undefined' || rawUrl == null || !rawUrl || rawUrl.toString().length == 0)
            return '';
        if (rawUrl.indexOf('.') < 1)
            return '';
        rawUrl = rawUrl.toLowerCase();
        if (rawUrl.indexOf('http://') < 0 && rawUrl.indexOf('https://') < 0)
            rawUrl = 'http://' + rawUrl;
        return rawUrl;
    },
    countWords: function(rawValue) {
        if (rawValue == null || !rawValue || rawValue.toString().length == 0)
            return 0;
        var stringValue = rawValue.toString();
        while (stringValue.indexOf('  ') > 0)
            stringValue = stringValue.replace('  ', ' ');
        return stringValue.split(' ').length;
    },
    parseDate: function(rawDate) {
        if (rawDate != null && rawDate.toString().length == 8) {
            var day =  parseInt(rawDate.substr(0, 2));
            var month = parseInt(rawDate.substr(2, 2));
            var year = parseInt(rawDate.substr(4, 4));
            if (!isNaN(day) && day > 0 && day <= 31 &&
                !isNaN(month) && month > 0 && month <= 12 &&
                !isNaN(year) && year > 1900 && year <= 2100) {
                return new Date(year, month - 1, day);
            }
        }
        return null;
    },
    isNullOrEmpty: function(obj) {
        if (typeof obj == 'undefined')
            return true;
        if (obj == null)
            return true;
        return $.trim(obj.toString()).length == 0;
    },
    shallowCopy: function(obj) {
        var clone = {};
        if (obj != null) {
            for (var prop in obj) {
                clone[prop] = obj[prop];
            }
        }
        return clone;
    },
    VerifyUser: function($http, $scope, extraRoles, callback) {
        function ApplyUnauthorized() {
            $scope.Unauthorized = true;
            window['qL_Finish_Now'] = true;
            if (callback != null) {
                callback(false);
            }
        }

        function UserAuthorized() {
            if (callback != null) {
                callback(true);
            } else {
                ChainFactory.Next();
            }
        }

        if (typeof extraRoles == 'undefined')
            extraRoles = [];

        if (typeof callback == 'undefined')
            callback = null;

        $http.get("/api/login").then(function (resp) {
            if (resp && resp.data) {
                $scope.LoggedInUser = sportUtils.shallowCopy(resp.data);
                if (resp.data.role == 1) {
                    //admin can do anything
                    UserAuthorized();
                } else {
                    //maybe fits extra role?
                    if (extraRoles.indexOf(resp.data.role) >= 0) {
                        UserAuthorized();
                    } else {
                        ApplyUnauthorized();
                    }
                }
            } else {
                ApplyUnauthorized();
            }
        }, function(err) {
            console.log('error verifying user');
            console.log(err);
            ApplyUnauthorized();

        });
    },
    AttachAutoClick: function() {
        $('.auto-click').off('keypress');
        $('.auto-click').keypress(function(evt) {
            var element = $(this);
            var targetId = element.data('button-id');
            if (targetId) {
                var keyCode = evt.keyCode || evt.which;
                if (keyCode == 13) {
                    evt.preventDefault();
                    $('#' + targetId).trigger('click');
                    element.trigger('change');
                }
            }
        });
    },
    AddIfDoesNotExist: function(mapping, rawKey, value) {
        var key = rawKey.toString();
        if (!mapping[key])
            mapping[key] = value;
    },
    FlattenAssociativeArray: function(mapping, matchingValue) {
        if (typeof matchingValue == 'undefined')
            matchingValue = null;
        var flatArray = [];
        for (var key in mapping) {
            if (matchingValue == null || mapping[key] == matchingValue) {
                flatArray.push(key);
            }
        }
        return flatArray;
    },
    SplitArray: function(arr, numOfItems) {
        if (typeof numOfItems == 'undefined' || numOfItems < 1)
            numOfItems = 1;
        var arrayOfArrays = [], buffer = [];
        for (var i = 0; i < arr.length; i++) {
            var curItem = arr[i];
            if (i > 0 && (i % numOfItems) == 0) {
                arrayOfArrays.push(buffer);
                buffer = [];
            }
            buffer.push(curItem);
        }
        if (buffer.length > 0)
            arrayOfArrays.push(buffer);
        return arrayOfArrays;
    },
    CopyArray: function(source, target) {
        if (source && target) {
            for (var i = 0; i < source.length; i++) {
                var curItem = source[i];
                target.push(curItem);
            }
        }
    },
    InsertIntoArray: function(array, item) {
        var newArray = [item];
        for (var i = 0; i < array.length; i++) {
            newArray.push(array[i]);
        }
        return newArray;
    },
    DistinctArray: function(array, propName) {
        if (typeof propName == 'undefined')
            propName = '';
        var mapping = {};
        var distinctItems = [];
        for (var i = 0; i < array.length; i++) {
            var x = array[i] == null ? '' : array[i];
            var key = (propName.length > 0) ? (x[propName] || '').toString() : x.toString();
            if (!mapping[key]) {
                distinctItems.push(x);
                mapping[key] = true;
            }
        }
        return distinctItems;
    },
    IsArray: function(obj) {
        return !!obj && obj.constructor === Array;
    },
    EncodeHTML: function(rawText) {
        if (typeof rawText == 'undefined' || rawText == null)
            rawText = '';
        var encodedText = rawText.toString();
        while (encodedText.indexOf('\r\n') >= 0)
            encodedText = encodedText.replace('\r\n', '\n')
        while (encodedText.indexOf('\n\r') >= 0)
            encodedText = encodedText.replace('\n\r', '\n')
        while (encodedText.indexOf('\n') >= 0)
            encodedText = encodedText.replace('\n', '<br />')
        return encodedText;
    },
    StripHtmlTags: function(rawValue) {
        var stripped = '';
        if (rawValue && rawValue.length > 0) {
            var insideTag = false;
            var tagBuffer = '';
            for (var i = 0; i < rawValue.length; i++) {
                var curChar = rawValue.charAt(i);
                if (insideTag && curChar == '>') {
                    insideTag = false;
                    tagBuffer = '';
                    continue;
                } else if (curChar == '<') {
                    insideTag = true;
                    tagBuffer = '';
                }
                if (insideTag) {
                    tagBuffer +=  curChar;
                } else {
                    stripped += curChar;
                }
            }
        }
        if (tagBuffer.length > 0)
            stripped += tagBuffer;
        return stripped;
    },
    CreateShortVersion: function(fullText, maxLength, addDots) {
        var _this = this;
        if (fullText == null || !fullText || fullText.length == 0)
            return  '';

        if (typeof addDots == 'undefined')
            addDots = true;

        var shortVersion = _this.StripHtmlTags(fullText);
        if (shortVersion.length > maxLength) {
            var breakingChars = ' ,.-()[]{}?!';
            var index = maxLength;
            while (index >= 0) {
                if (breakingChars.indexOf(shortVersion.charAt(index)) >= 0)
                    break;
                index--;
            }
            if (index > 0) {
                shortVersion = shortVersion.substr(0, index);
                if (addDots)
                    shortVersion += '...';
            }
        }
        return shortVersion;
    },
    HebrewMonthName: function(month) {
        switch (month) {
            case 1:
                return 'ינואר';
            case 2:
                return 'פברואר';
            case 3:
                return 'מרץ';
            case 4:
                return 'אפריל';
            case 5:
                return 'מאי';
            case 6:
                return 'יוני';
            case 7:
                return 'יולי';
            case 8:
                return 'אוגוסט';
            case 9:
                return 'ספטמבר';
            case 10:
                return 'אוקטובר';
            case 11:
                return 'נובמבר';
            case 12:
                return 'דצמבר';
        }
        return  '';
    },
    InitJackbox: function() {
        //console.log('init jackbox called, groups: ' + $(".jackbox[data-group]").length)
        if($(".jackbox[data-group]").length){
            $(".jackbox[data-group]").each(function() {
                var curItem = $(this);
                var timerTime = 10;

                //remove if already exists due to state change
                try {
                    curItem.jackBox("removeItem");
                } catch (err) {
                    //console.log('error removing jackbox for ' + curItem.attr('href') + ': ' + err);
                    timerTime = 1000;
                }

                window.setTimeout(function() {
                    curItem.jackBox("init", {
                        showInfoByDefault: false,
                        //defaultShareImage: '',
                        deepLinking: false,
                        preloadGraphics: false,
                        fullscreenScalesContent: true,
                        autoPlayVideo: false,
                        flashVideoFirst: false,
                        defaultVideoWidth: 960,
                        defaultVideoHeight: 540,
                        baseName: ".jackbox",
                        className: ".jackbox",
                        useThumbs: true,
                        thumbsStartHidden: false,
                        thumbnailWidth: 75,
                        thumbnailHeight: 50,
                        useThumbTooltips: false,
                        showPageScrollbar: false,
                        useKeyboardControls: true
                    });
                }, timerTime);
            });

            window.setInterval(function() {
                var imageDescription = '';
                var oContent = $('.jackbox-content');
                if (oContent.length > 0) {
                    var imageSrc = oContent.attr('src');
                    var matchingImage = null;
                    var allImages = $('#galleryContainer').find('img');
                    for (var i = 0; i < allImages.length; i++) {
                        var currentImage = allImages.eq(i);
                        if (currentImage.attr('src') == imageSrc) {
                            matchingImage = currentImage;
                            break;
                        }
                    }
                    if (matchingImage != null) {
                        var description = $.trim(matchingImage.parents('li').find('.image-description').text());
                        $('.jackbox-custom-title').text(description);
                    }
                }

            }, 1000);
        }
    },
    autoSizeFrames: [],
    autoSizeTimer: 0,
    FrameAutoSize: function(frameData) {
        if (sportUtils.IsMobile())
            return;

        if (frameData && frameData.Id && frameData.Id.length > 0 && sportUtils.autoSizeFrames.indexOf(frameData.Id) < 0) {
            sportUtils.autoSizeFrames.push(frameData);
            if (!sportUtils.autoSizeTimer) {
                sportUtils.autoSizeTimer = window.setInterval(function() {
                    for (var i = 0; i < sportUtils.autoSizeFrames.length; i++) {
                        var curFrameData = sportUtils.autoSizeFrames[i];
                        var frameId = curFrameData.Id;
                        var frameElement = $('#' + frameId);
                        if (frameElement.length == 1) {
                            var parentElement = frameElement.parent();
                            if (parentElement.length > 0) {
                                var parentWidth = parentElement.width();
                                if (parentWidth > 0) {
                                    var lastWidth = parseInt(frameElement.data('previousParentWidth'));
                                    if (isNaN(lastWidth) || lastWidth != parentWidth) {
                                        var frameSrc = curFrameData.Src.replace('$width', parentWidth.toString());
                                        frameElement.attr('src', frameSrc);
                                        frameElement.data('previousParentWidth', parentWidth)
                                        //http://www.facebook.com/plugins/likebox.php?href=http%3A%2F%2Fwww.facebook.com%2Fisrschspo&width=408&colorscheme=light&show_faces=true&border_color&stream=true&height=435
                                    }
                                }
                            }
                        }
                    }
                }, 1000);
            }
        }
    },
    IsInteger: function(n) {
        return parseInt(n, 10) == n;
    },
    getRoundedRectangleClass: function(item, additionalClass) {
        var classArray = ['common_rounded_rectangle'];
        if (item.Selected)
            classArray.push('selected_rounded_rectangle');
        else
            classArray.push('transparent_rounded_rectangle');
        if (typeof additionalClass != 'undefined' && additionalClass)
            classArray.push(additionalClass);
        return classArray.join(' ');
    },
    getRoundedRectangleStyle: function(item, bgColor) {
        var style = 'border-color: ' + bgColor + ';';
        if (item.Selected)
            style += ' background-color: ' + bgColor + ';';
        return style;
    },
    getCurrentSeason: function() {
        return {
            'Name': localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Name] || '',
            'Season': localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Year] || 0
        };
    },
    setCurrentSeason: function(season) {
        if (season != null && season.Season > 0) {
            localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Name] = season.Name;
            localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Year] = season.Season;
        } else {
            localStorage.removeItem(sportGlobalSettings.LocalStorageKeys.CurrentSeason.Name);
            localStorage.removeItem(sportGlobalSettings.LocalStorageKeys.CurrentSeason.Year);
        }
    },
    IsValidIdNumber: function(str) {
        // Just in case -> convert to string
        var idNumber = String(str);

        // Validate correct input
        if (idNumber.length > 9 || idNumber.length < 5 || isNaN(idNumber))
            return false;

        // The number is too short - add leading 0000
        while (idNumber.length < 9)
            idNumber = '0' + idNumber;

        // CHECK THE ID NUMBER
        var mone = 0, incNum;
        for (var i = 0; i < 9; i++) {
            incNum = Number(idNumber.charAt(i));
            incNum *= (i % 2) + 1;
            if (incNum > 9)
                incNum -= 9;
            mone += incNum;
        }

        return (mone % 10 == 0);
    },
    HandleFinalsTree: function() {
        function ExtractTeamName(oTeam) {
            return $.trim(oTeam.find(".team-name").text());
        }

        function ExtractTeamScore(oTeam) {
            return parseInt($.trim(oTeam.find(".team-score").text()));
        }

        if ($(".quarter-finals-right-side").length > 0) {
            var firstRightSide = $(".quarter-finals-right-side").first();
            var treeContainer = $(".FinalsTreeContainer");
            var rightMost = firstRightSide.position().left + firstRightSide.width();
            var parentWidth = $(".FinalsTreeContainer").parents(".row").first().width();
            if (parentWidth > rightMost) {
                var leftPos = Math.floor((parentWidth - rightMost) / 2);
                treeContainer.css("left", leftPos + "px");
            }
            var allFinalTeams = $(".team-box.finals");
            if (allFinalTeams.length == 2) {
                var finalsTeamA = allFinalTeams.eq(0), finalsTeamB = allFinalTeams.eq(1);
                var finalsTeamMapping = {}, semiFinalsTeamMapping = {};
                finalsTeamMapping[ExtractTeamName(finalsTeamA)] = true;
                finalsTeamMapping[ExtractTeamName(finalsTeamB)] = true;
                var finalsTeamA_Score = ExtractTeamScore(finalsTeamA), finalsTeamB_Score = ExtractTeamScore(finalsTeamB);
                if (!isNaN(finalsTeamA_Score) && !isNaN(finalsTeamA_Score)) {
                    if (finalsTeamA_Score > finalsTeamB_Score) {
                        finalsTeamA.addClass("winner-team");
                    } else if (finalsTeamB_Score > finalsTeamA_Score) {
                        finalsTeamB.addClass("winner-team");
                    }
                }
            }

            $(".team-box.semi-finals-right-side,.team-box.semi-finals-left-side").each(function() {
                var oTeam = $(this);
                var curTeamName = ExtractTeamName(oTeam);
                semiFinalsTeamMapping[curTeamName] = true;
                if (finalsTeamMapping[curTeamName] == true)
                    oTeam.addClass("winner-team");
            });

            $(".team-box.quarter-finals-left-side,.team-box.quarter-finals-right-side").each(function() {
                var oTeam = $(this);
                var curTeamName = ExtractTeamName(oTeam);
                if (semiFinalsTeamMapping[curTeamName] == true) {
                    oTeam.addClass("winner-team");
                }
            });
        }
        window.setTimeout(sportUtils.HandleFinalsTree, 500);
    },
    InitiateScrollToTopProcess: function() {
        function ClearInterval(event) {
            if (sportUtils.scrollToTopInterval) {
                if (!event.target || event.target.id != 'qLoverlay') {
                    window.clearInterval(sportUtils.scrollToTopInterval);
                    sportUtils.scrollToTopInterval = 0;
                    $(document).unbind('mousemove keyup keydown touchstart touchmove mousewheel', ClearInterval);
                }
            }
        }

        if (sportUtils.scrollToTopInterval == 0) {
            sportUtils.scrollToTopInterval = window.setInterval(function () {
                if (sportUtils.scrollToTopCounter >= 50) {
                    window.clearInterval(sportUtils.scrollToTopInterval);
                    return;
                }
                if (document && document.body) {
                    if (document.body.scrollTop > 0) {
                        document.body.scrollTop = 0;
                        sportUtils.scrollToTopCounter++;
                        if (!sportUtils.scrollToTopEventsAttached) {
                            $(document).bind('mousemove keyup keydown touchstart touchmove mousewheel', ClearInterval);
                            sportUtils.scrollToTopEventsAttached = true;
                        }
                    }
                }
            }, 100);
        }
    },
    IntegerOnlyTextbox: function(textboxID) {
        var element = $('#' + textboxID);
        if (element.length == 1) {
            element.unbind('keypress', IntegerTextboxKeyPress).unbind('blur', IntegerTextboxBlur);
            element.bind('keypress', IntegerTextboxKeyPress).bind('blur', IntegerTextboxBlur);
        }
    },
    SerializeForQueryString: function(obj, prefix, numbersOnly) {
        if (typeof numbersOnly == 'undefined')
            numbersOnly = false;
        var qsParts = [];
        for (var prop in obj) {
            var value = obj[prop];
            if (value != null) {
                if (numbersOnly == false || (numbersOnly == true && !isNaN(parseInt(value)))) {
                    var key = prefix + prop.toString();
                    qsParts.push(key + '=' + encodeURIComponent(value));
                }
            }
        }
        return qsParts.join('&');
    }
};

var ChainFactory = {
    Callbacks: [],
    CurrentIndex: 0,
    Next: function() {
        if (this.CurrentIndex < this.Callbacks.length) {
            var index = this.CurrentIndex;
            this.CurrentIndex++;
            this.Callbacks[index]();
        }
    },
    Execute: function() {
        this.Callbacks = [];
        this.CurrentIndex = 0;
        for (var i = 0; i < arguments.length; i++) {
            var curArg = arguments[i];
            if (typeof curArg == 'function')
                this.Callbacks.push(curArg);
        }
        this.Next();
    }
};

function _sportUtilMisc_ParseColors(rawValue) {
    var commaIndex = (rawValue || '').indexOf(',');
    if (commaIndex > 0) {
        var evenColor = rawValue.substr(0, commaIndex);
        var oddColor = rawValue.substring(commaIndex + 1);
        if (evenColor.length > 0 && oddColor.length > 0) {
            return {
                'Valid': true,
                'Even': evenColor,
                'Odd': oddColor
            };
        }
    }
    return {
        'Valid': false
    }
}

var _sportUtilMiscTimer_Counter = 0;

function TimedFunctions() {
    function HandleProgressDots() {
        if ((_sportUtilMiscTimer_Counter % 5) != 0)
            return;

        var dotLabels = $(".progress-dot");
        if (dotLabels.length == 0)
            return;

        dotLabels.each(function () {
            var dotsLabel = $(this);
            var parentDiv = dotsLabel.parents("div").first();
            if (parentDiv.is(":visible")) {
                var dotCount = dotsLabel.text().length;
                dotCount++;
                if (dotCount > 3)
                    dotCount = 1;
                var dots = Array(dotCount + 1).join(".");
                dotsLabel.text(dots);
            }
        });
    }

    function HandleAlternatingColors() {
        var alternatingColors = $('.alternating-colors');
        if (alternatingColors.length == 0)
            return;

        var validItemsCounter = 0;
        alternatingColors.each(function () {
            var currentElement = $(this);
            var colors = _sportUtilMisc_ParseColors(currentElement.data('colors'));
            if (colors.Valid) {
                var curColor = ((validItemsCounter % 2) == 0) ? colors.Even : colors.Odd;
                currentElement.css('background-color', curColor);
                validItemsCounter++;
            }
        });
    }

    function HandleDependantHeight() {
        var dependantHeightElements = $('.dependant-height');
        if (dependantHeightElements.length == 0)
            return;

        dependantHeightElements.each(function () {
            var element = $(this);
            var sourceElementId = element.data("source-element");
            if (sourceElementId) {
                var sourceElement = $("#" + sourceElementId);
                if (sourceElement.length == 1) {
                    var totalHeight = sourceElement[0].offsetHeight;
                    if (totalHeight > 0) {
                        element.css("height", totalHeight + "px");
                        element.css("line-height", totalHeight + "px");
                        element.css("vertical-alignment", "middle");
                    }
                }
            }
        });
    }

    function CheckDirty() {
        var checkDirtyElements = $(".check-dirty");
        if (checkDirtyElements.length == 0)
            return;

        checkDirtyElements.each(function () {
            var oForm = $(this);
            if (oForm.data("check-dirty-attached") != "1") {
                oForm.find("input").each(function () {
                    var oInput = $(this);
                    oInput.change(function () {
                        oForm.data("is-dirty", "1");
                    });
                });
                oForm.data("check-dirty-attached", "1");
            }
        });
    }

    function HandlePageTypeMapping() {
        var pageTypeMapping = window['page_type_mapping'];
        if (pageTypeMapping && pageTypeMapping != null) {
            var pageLinks = $('a[href*="/page/"]');
            if (pageLinks.length > 0) {
                pageLinks.each(function () {
                    var oLink = $(this);
                    var curHref = oLink.attr("href");
                    var index = curHref.lastIndexOf('/');
                    if (index > 0 && index < (curHref.length - 1)) {
                        var pageSeq = curHref.substr(index + 1);
                        var pageType = pageTypeMapping[pageSeq];
                        if (pageType) {
                            var newHref = curHref.replace('/page/', '/' + pageType + '/');
                            oLink.attr('href', newHref);
                            oLink.onclick = null;
                        }
                    }
                });
            }
        }
    }

    function HandleMobile() {
        if (!sportUtils.IsMobile())
            return;

        var reverseOrderElements = $(".mobile-reverse-order");
        if (reverseOrderElements.length == 0)
            return;

        reverseOrderElements.each(function() {
            var curElement = $(this);
            if (curElement.data("reversed") != "1") {
                var children = curElement.find("> div");
                curElement.append(children.get().reverse());
                curElement.data("reversed", "1");
            }
        });
    }

    function HandleSameFacilities() {
        $(".match-group").each(function() {
            var oMatchGroup = $(this);
            if (oMatchGroup.data("applied-same-facility") != "1") {
                oMatchGroup.data("applied-same-facility", "1");
                var oDateLabel = oMatchGroup.find(".match-date-label").first();
                var arrFacilities = oMatchGroup.find(".category-facility");
                var prevFacilityName = "";
                var sameFacilityCount = 0;
                for (var i = 0; i < arrFacilities.length; i++) {
                    var currentFacilityName = $.trim(arrFacilities.eq(i).text());
                    if (currentFacilityName.length > 0) {
                        if (prevFacilityName.length > 0 && currentFacilityName != prevFacilityName) {
                            if (sameFacilityCount > 1) {
                                var oMatch = arrFacilities.eq(i - 1).parents(".group-match").first();
                                var dateLabelClone = oDateLabel.clone();
                                dateLabelClone.insertAfter(oMatch);
                                oMatch.find(".alternating-colors").css("margin-bottom", "10px");
                            }
                            sameFacilityCount = 0;
                        }
                        sameFacilityCount++;
                        prevFacilityName = currentFacilityName;
                    }
                }
            }
        });
    }

    function HandleMiscStuff() {
        var vodRow = document.getElementById("VOD_row");
        var pnlSales = document.getElementById("pnlSales");
        if (vodRow && vodRow != null && pnlSales != null) {
            var bottom = vodRow.offsetTop + vodRow.offsetHeight;
            var height = bottom - pnlSales.offsetTop;
            $("#pnlSales").css("height", height + "px");
        }
    }

    if (_sportUtilMiscTimer_Counter > 1000000)
        _sportUtilMiscTimer_Counter = 0;
    _sportUtilMiscTimer_Counter++;
    HandleProgressDots();
    HandleAlternatingColors();
    HandleDependantHeight();
    CheckDirty();
    HandlePageTypeMapping();
    HandleMobile();
    HandleSameFacilities();
    HandleMiscStuff();
}

var _sportUtilMiscTimer = window.setInterval(TimedFunctions, 200);